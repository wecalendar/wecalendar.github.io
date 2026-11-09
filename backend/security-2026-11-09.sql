-- WeCalendar security hardening (2026-11-09). Run PART A, deploy b.html / analytics.html /
-- publish-link, then run PART B. Already applied to production.

-- PART 0 (applied first) — only the server may create links. publish_link trusted any p_email, so
-- anyone holding the public key could publish links (and change video links) as any host.
revoke execute on function public.publish_link(text, text, text, text, jsonb, text, integer, integer, integer, integer, integer, jsonb) from public, anon, authenticated;
grant  execute on function public.publish_link(text, text, text, text, jsonb, text, integer, integer, integer, integer, integer, jsonb) to service_role;

-- PART A ---------------------------------------------------------------------------------------
-- The booking page asks for exactly one link by its slug. No host id, no co-host emails.
create or replace function public.booking_page(p_slug text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'link',  jsonb_build_object('id', l.id, 'title', l.title, 'tz', l.tz, 'status', l.status),
    'slots', coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'start_utc', s.start_utc, 'end_utc', s.end_utc, 'status', s.status) order by s.start_utc)
                       from slots s where s.link_id = l.id), '[]'::jsonb))
  from links l where l.slug = p_slug and l.status = 'active'
$$;
revoke execute on function public.booking_page(text) from public;
grant  execute on function public.booking_page(text) to anon, authenticated, service_role;

-- Retention: a client's name and email are erased 30 days after their meeting ends.
-- The booking row stays (without personal data) so analytics counts are unchanged.
create or replace function public.purge_guest_data() returns integer
language sql security definer set search_path = public as $$
  with x as (
    update bookings b set guest_name = null, guest_email = null
    where (b.guest_name is not null or b.guest_email is not null)
      and coalesce((select s.end_utc from slots s where s.id = b.slot_id), b.created_at) < now() - interval '30 days'
    returning 1)
  select count(*)::int from x
$$;
revoke execute on function public.purge_guest_data() from public, anon, authenticated;
grant  execute on function public.purge_guest_data() to service_role;
select cron.schedule('wecal-purge-guest-data', '41 3 * * *', 'select public.purge_guest_data()');
select public.purge_guest_data();

-- PART B (after the new pages are live) ---------------------------------------------------------
-- Nobody outside the server can list links or slots any more.
drop policy if exists anon_read_active_links on public.links;
drop policy if exists anon_read_slots on public.slots;
-- Analytics now go through publish-link (company sign-in checked server-side).
revoke execute on function public.get_stats() from public, anon, authenticated;
grant  execute on function public.get_stats() to service_role;
