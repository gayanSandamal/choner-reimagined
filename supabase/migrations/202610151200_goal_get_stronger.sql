-- "Sleep better" retires; "Get stronger" takes its place.
--
-- Why: the first question exists to point at an activity two people can do
-- together. Sleep better was the one goal a person can pursue entirely alone,
-- and it pointed at Walking and Yoga, which Reduce stress already owns. Get
-- stronger answers to Workouts, which had only one weak claimant.
-- See docs/DECISIONS_LOG.md, 15 October 2026.
--
-- The old value stays ALLOWED. The constraint is widened, not swapped:
--   * existing rows keep their answer rather than becoming invalid, and
--   * join.choner.io is live, so a browser holding the old page in cache can
--     still post 'sleep_better' and have the signup accepted.
-- Nothing reads primary_goal for matching, so a retired value is dead weight,
-- never a wrong answer. public.profiles.primary_goal is untyped text and needs
-- no migration at all.

alter table public.prelaunch_registrations
  drop constraint if exists prelaunch_registrations_primary_goal_check;

alter table public.prelaunch_registrations
  add constraint prelaunch_registrations_primary_goal_check
  check (primary_goal in
    ('move_more', 'get_stronger', 'reduce_stress', 'improve_energy',
     'sleep_better'));
