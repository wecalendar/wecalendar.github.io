-- WeCalendar security self-check (2026-11-09). Run: select public.security_report();
-- Returns { status: "ok" | "attention", issues: [...], facts: {...} }. Contains no personal data:
-- only counts, rule names and function names. Callable by the server role only.
create or replace function public.security_report() returns jsonb
language plpgsql security definer set search_path = public, cron as $$
declare
  issues text[] := '{}';
  facts jsonb := '{}';
  v_int int; v_txt text; v_json jsonb;
begin
  -- 1. Public (anon) access rules: only the analytics insert rule is expected.
  select coalesce(jsonb_agg(tablename || ':' || policyname), '[]') into v_json
    from pg_policies where schemaname = 'public'
     and ('public' = any(roles) or 'anon' = any(roles))
     and not (tablename = 'analytics_events' and policyname = 'anon_log_analytics');
  if jsonb_array_length(v_json) > 0 then issues := issues || ('Unexpected public access rules: ' || v_json::text); end if;
  select count(*) into v_int from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;
  if v_int > 0 then issues := issues || (v_int || ' table(s) without row-level security'); end if;

  -- 2. Functions the public key can call: only booking_page is expected.
  select coalesce(jsonb_agg(p.proname), '[]') into v_json from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'execute') and p.proname <> 'booking_page';
  if jsonb_array_length(v_json) > 0 then issues := issues || ('Functions callable with the public key: ' || v_json::text); end if;

  -- 3. Hosts and calendar connections.
  select count(*) into v_int from hosts where not (lower(email) like '%@wetransact.io' or lower(email) like '%@awssome.io');
  if v_int > 0 then issues := issues || (v_int || ' host(s) outside wetransact.io / awssome.io'); end if;
  facts := facts || jsonb_build_object(
    'hosts', (select count(*) from hosts),
    'calendar_connections', (select count(*) from host_tokens),
    'connections_failing', (select count(*) from host_tokens where check_ok = false),
    'connections_by_provider', (select coalesce(jsonb_object_agg(provider, n), '{}') from (select provider, count(*) n from host_tokens group by provider) x));
  if exists (select 1 from host_tokens where provider <> 'microsoft') then issues := issues || 'Non-Microsoft calendar connection found (Google path is supposed to be off)'; end if;
  if not exists (select 1 from pg_constraint where conname = 'hosts_company_email') then issues := issues || 'Company-email rule on hosts is missing'; end if;

  -- 4. Retention: no client name/email older than 30 days after the meeting.
  select count(*) into v_int from bookings b left join slots s on s.id = b.slot_id
    where (b.guest_name is not null or b.guest_email is not null)
      and coalesce(s.end_utc, b.created_at) < now() - interval '31 days';
  if v_int > 0 then issues := issues || (v_int || ' booking(s) still hold client details past the 30-day limit'); end if;

  -- 5. Scheduled jobs present and healthy (last 7 days).
  select coalesce(jsonb_agg(jobname), '[]') into v_json from (values ('wecal-purge-guest-data'), ('wecal-reminders'), ('wecal-keepalive')) j(jobname)
    where not exists (select 1 from cron.job c where c.jobname = j.jobname);
  if jsonb_array_length(v_json) > 0 then issues := issues || ('Missing scheduled jobs: ' || v_json::text); end if;
  select count(*) into v_int from cron.job_run_details d join cron.job c on c.jobid = d.jobid
    where d.status = 'failed' and d.start_time > now() - interval '7 days';
  if v_int > 0 then issues := issues || (v_int || ' scheduled job run(s) failed this week'); end if;

  -- 6. Abuse signals (last 24 h / 7 days). Thresholds are deliberately generous.
  select coalesce(max(n), 0) into v_int from (select count(*) n from bookings where created_at > now() - interval '24 hours' group by link_id) x;
  facts := facts || jsonb_build_object('max_bookings_one_link_24h', v_int);
  if v_int > 10 then issues := issues || ('One link got ' || v_int || ' bookings in 24 h'); end if;
  select coalesce(max(n), 0) into v_int from (select count(*) n from bookings where created_at > now() - interval '24 hours' group by lower(guest_email)) x;
  facts := facts || jsonb_build_object('max_bookings_one_email_24h', v_int);
  if v_int > 3 then issues := issues || ('One email made ' || v_int || ' bookings in 24 h'); end if;
  select count(*) into v_int from bookings b where b.created_at > now() - interval '7 days'
    and (b.guest_name ~* '(https?://|www\.|\.(com|net|io|xyz|ru|top)\b)' );
  if v_int > 0 then issues := issues || (v_int || ' booking(s) this week with a link-like name'); end if;
  facts := facts || jsonb_build_object(
    'bookings_7d', (select count(*) from bookings where created_at > now() - interval '7 days'),
    'cancellations_7d', (select count(*) from bookings where status = 'cancelled' and created_at > now() - interval '7 days'),
    'links_created_7d', (select count(*) from links where created_at > now() - interval '7 days'),
    'page_views_7d', (select count(*) from analytics_events where type = 'view' and ts > now() - interval '7 days'));

  return jsonb_build_object('checked_at', now(), 'status', case when cardinality(issues) = 0 then 'ok' else 'attention' end,
                            'issues', to_jsonb(issues), 'facts', facts);
end $$;
revoke execute on function public.security_report() from public, anon, authenticated;
grant  execute on function public.security_report() to service_role;
