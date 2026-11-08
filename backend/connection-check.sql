-- Calendar connection health (2026-11-08). Run once BEFORE deploying publish-link FIXED5.
alter table public.host_tokens add column if not exists check_ok boolean;
alter table public.host_tokens add column if not exists checked_at timestamptz;
