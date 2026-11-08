-- Weekly keep-alive (2026-11-08): every Monday 05:23 UTC. Reuses the reminders job's x-cron-key header,
-- copied from that job's command so the key is never typed out.
select cron.schedule('wecal-keepalive', '23 5 * * 1', replace(command, '/functions/v1/cron-reminders', '/functions/v1/keep-alive'))
from cron.job where jobname = 'wecal-reminders';
