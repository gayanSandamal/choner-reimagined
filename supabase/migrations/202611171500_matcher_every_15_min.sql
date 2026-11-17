-- The matcher ran every 5 minutes and each run takes about 0.6 s on the
-- free plan's shared processor, competing with people using the app.
-- Every 15 minutes is enough for launch (decided 17 November 2026).
-- Same minute offset as before (:02), so it still runs between the other
-- 15-minute jobs rather than on top of them.
select cron.alter_job(
  (select jobid from cron.job where jobname = 'choner-partner-matching'),
  schedule := '2-47/15 * * * *'
);
