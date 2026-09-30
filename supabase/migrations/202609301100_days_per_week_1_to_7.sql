-- SCHEMA_CHALLENGES.md §4: days_per_week rejected 1x and 2x.
--
-- 202609181600 set check (days_per_week in (3, 4, 5, 7)). The product offers
-- 1x, 2x and 3x a week, so 1, 2 and 6 all fail today. Range is now 1..7, where
-- 7 is labelled "Daily" in the UI.
--
-- Also nullable, no default. Cadence is agreed at the FIRST PLAN by both
-- people, not at onboarding and not when the commitment is created, so at
-- insert time it is genuinely unknown. The default of 7 was the old implicit
-- "daily" shape and is no longer the default shape of anything. Existing rows
-- keep whatever value they have; every function that inserts a challenge
-- without naming the column now gets NULL, which the client already treats as
-- "not set" (features/challenges/matching.ts, features/directory/format.ts).
--
-- The old migration is not edited: it has already run.

alter table public.user_challenges
  drop constraint if exists user_challenges_days_per_week_check;

alter table public.user_challenges
  alter column days_per_week drop not null,
  alter column days_per_week drop default;

alter table public.user_challenges
  add constraint user_challenges_days_per_week_check
  check (days_per_week is null or days_per_week between 1 and 7);
