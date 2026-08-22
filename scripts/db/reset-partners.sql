-- Unpair everybody, and leave a stocked pool to test against.
--
-- Nothing is deleted except pairings: no account, profile, challenge, reflection
-- or check-in is touched. Everyone keeps their habit and their history.
--
-- WHY THIS ALSO PAUSES THE SWEEP
--
-- choner-partner-matching pairs everyone waiting in the pool every five
-- minutes. Put 870 sample users back in the pool and leave it running and they
-- pair off with each other almost immediately -- the reset would be undone
-- before you could open the app, and the pool you wanted to test against would
-- be gone.
--
-- Pausing the sweep does NOT make matching slower for the tester, because the
-- two paths are different: join_match_pool() fires a run scoped to the ONE
-- person who tapped Find, and that still happens instantly. Only the global
-- pairing of everyone-with-everyone stops. So the sample users sit available,
-- and whoever taps Find is matched in about a second.
--
-- Re-enable with:  npm run reset:partners -- --resume

\set ON_ERROR_STOP on

begin;

-- ============================================================
-- 1. Every pairing goes
-- ============================================================
delete from public.partner_matches;

update public.user_challenges
set partner_user_id = null,
    partner_state = 'solo'
where partner_user_id is not null or partner_state <> 'solo';

-- ============================================================
-- 2. Empty the pool, then restock it with the sample users only
-- ============================================================
--
-- Sample accounts go back in because being findable is the entire reason they
-- exist. Real accounts deliberately do NOT: a person is only ever in the pool
-- because they tapped Find, and putting them back would be matching somebody
-- who never asked -- exactly the consent rule the rest of this feature is
-- built on. Tap Find yourself and the normal flow runs.
update public.partner_match_requests
set status = 'cancelled', no_match_at = null, updated_at = now()
where status <> 'cancelled';

insert into public.partner_match_requests
  (user_id, user_challenge_id, challenge_template_id, timezone, status, created_at, updated_at)
select uc.user_id, uc.id, uc.challenge_template_id, p.timezone, 'waiting',
       -- Spread over the last few days so the fairness weighting, which starts
       -- after 48h in the pool, still has something to rank on.
       now() - make_interval(mins => (abs(hashtext(uc.user_id::text)) % 7200)),
       now()
from public.user_challenges uc
join public.profiles p on p.id = uc.user_id
join auth.users u on u.id = uc.user_id
where uc.status = 'active'
  and uc.custom_habit_title is null      -- Find is hidden for these anyway
  and u.email ~ '^sample[0-9]+@choner\.test$';

update public.user_challenges uc
set partner_state = 'finding'
where exists (
  select 1 from public.partner_match_requests r
  where r.user_id = uc.user_id and r.status = 'waiting'
);

-- ============================================================
-- 3. A clean slate for the things that gate testing
-- ============================================================
delete from public.partner_search_attempts;              -- all three searches back
delete from public.notifications
 where kind in ('partner_matched', 'partner_nudge');     -- no stale "we found your partner"
delete from public.partner_nudges;                       -- nudge rate limit reset

commit;

-- ============================================================
-- 4. Stop the sweep from undoing all of the above
-- ============================================================
-- cron.alter_job, not `update cron.job`: the table is not writable by this role
-- ("permission denied for table job") and pg_cron expects changes through its
-- own API anyway. pg_reload_conf() because the launcher caches its job list and
-- will otherwise keep running the version it already has.
select cron.alter_job(jobid, active := false)
from cron.job where jobname = 'choner-partner-matching';

select pg_reload_conf();
