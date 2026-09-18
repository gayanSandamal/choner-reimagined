-- Clear the daily loop so it can be tested from day zero.
--
-- Companion to reset-partners.sql, which deliberately never touches check-ins
-- ("everyone keeps their habit and their history"). That is the right default
-- for testing matching, but it leaves the daily loop mid-flight: yesterday's
-- check-ins still count toward the streak, daily_status still remembers which
-- days were missed, and the starting-point prompt stays answered.
--
-- Nothing structural is deleted. No account, profile, challenge, task,
-- reflection or habit choice is touched — only the per-day records of what was
-- done, and the numbers the Home prompt collects. Every user keeps the
-- challenge they chose and goes back to day one of it.

\set ON_ERROR_STOP on

begin;

-- ============================================================
-- 1. Every check-in
--
-- Storage bytes for photo proof are NOT removed here. Deleting storage.objects
-- rows over SQL only drops the metadata and orphans the file; the bytes go
-- through the Storage API, which the checkin-photo cleanup sweep already owns.
-- Nulling photo_path first means those rows look unreferenced to the sweep, so
-- it collects them on its next pass rather than leaving them forever.
-- ============================================================
update public.task_checkins set photo_path = null where photo_path is not null;
delete from public.task_checkins;

-- ============================================================
-- 2. The per-day record
--
-- daily_status carries the missed-day flags, the late notes and the
-- miss-reason prompt stamps. Left behind, the miss-reason overlay would fire
-- on a challenge with no history to have missed.
-- ============================================================
delete from public.daily_status;

-- ============================================================
-- 3. The starting-point answers
--
-- Nulling the prompt stamp as well as the values, so the Home prompt returns
-- immediately rather than staying snoozed until tomorrow for anyone who had
-- already dismissed it today.
-- ============================================================
update public.user_challenges
set capability_value = null,
    beginner_start_value = null,
    commitment_value = null,
    starting_point_prompted_on = null;

-- ============================================================
-- 4. Back to day one
--
-- started_at drives the day index the whole UI counts from, so a challenge
-- with no check-ins but a three-week-old start date reads as "day 21, all
-- missed". ends_at follows the template's own length rather than a hardcoded
-- week.
-- ============================================================
update public.user_challenges uc
set started_at = now(),
    ends_at = now() + make_interval(days => coalesce(t.duration_days, 7)),
    completed_at = null,
    status = case when uc.status in ('completed', 'abandoned') then uc.status else 'active' end
from public.challenge_templates t
where t.id = uc.challenge_template_id;

commit;
