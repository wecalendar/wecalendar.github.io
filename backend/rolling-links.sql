-- Rolling booking links (2026-11-08). Run once in the SQL editor BEFORE deploying the new functions.
alter table public.links add column if not exists rolling boolean not null default false;
-- lets check-availability top a link up safely even if two visitors open it at the same moment
create unique index if not exists slots_link_start_uniq on public.slots (link_id, start_utc);
-- Existing "Copy my calendar link" links (they cover 8+ separate days) become rolling, which brings
-- the links that ran out of times back to life. Painted links (a few hand-picked times) are left alone.
update public.links l set rolling = true
where l.status = 'active' and not l.rolling
  and (select count(distinct (s.start_utc at time zone coalesce(l.tz, 'UTC'))::date) from public.slots s where s.link_id = l.id) >= 8;
