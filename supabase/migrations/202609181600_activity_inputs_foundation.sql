-- Phase 1 of the activity-inputs build: age/gender on the profile, activity
-- metadata on challenge_templates, and the capability/commitment/cadence
-- numbers on user_challenges. See Choner_Activity_Input_Fields_Spec_Final.md
-- and Choner_Onboarding_and_Matching_Flow_v4_gender.md.
--
-- Nothing here is asked of the user yet outside the new onboarding screens
-- being added alongside this migration — existing rows simply get sensible
-- defaults / nulls until the client starts writing real values.

-- ============================================================
-- 1. profiles — age band + gender
--
-- age_range already exists (20250324_initial.sql) but has never been read or
-- written anywhere in the app, so it is free to reuse for the band rather
-- than adding a second column. gender is new.
-- ============================================================
alter table public.profiles
  add column if not exists gender text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_gender_check'
  ) then
    alter table public.profiles
      add constraint profiles_gender_check
      check (gender is null or gender in ('male', 'female', 'prefer_not_to_say'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_age_range_check'
  ) then
    alter table public.profiles
      add constraint profiles_age_range_check
      check (age_range is null or age_range in ('18-24', '25-34', '35-44', '45-54', '55+'));
  end if;
end $$;

-- ============================================================
-- 2. challenge_templates — activity metadata
--
-- activity_key groups templates into the 6 matchable activities (Running,
-- Home workouts, Cycling, Yoga, Walking, Badminton). Null activity_key means
-- "not a matchable activity" — Journaling, No caffeine, deep breathing,
-- morning water, and the hidden custom-habit backer all stay null on
-- purpose: they have no physical unit and no matching pool.
--
-- metric_type/unit/default_target describe how "how much" is measured and
-- pre-filled. forced_mode mirrors the spec: Badminton is always 'together',
-- Home workouts is always 'separate'; null means the user chooses.
-- beginner_options is a small jsonb list of starting-point presets, so the
-- client never hardcodes "1 km / 2 km / 3 km / Not sure" per activity.
-- ============================================================
alter table public.challenge_templates
  add column if not exists activity_key text,
  add column if not exists metric_type text,
  add column if not exists unit text,
  add column if not exists default_target numeric,
  add column if not exists forced_mode text,
  add column if not exists beginner_options jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'challenge_templates_activity_key_check'
  ) then
    alter table public.challenge_templates
      add constraint challenge_templates_activity_key_check
      check (activity_key is null or activity_key in
        ('running', 'home_workouts', 'cycling', 'yoga', 'walking', 'badminton'));
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'challenge_templates_metric_type_check'
  ) then
    alter table public.challenge_templates
      add constraint challenge_templates_metric_type_check
      check (metric_type is null or metric_type in ('distance', 'duration', 'reps'));
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'challenge_templates_forced_mode_check'
  ) then
    alter table public.challenge_templates
      add constraint challenge_templates_forced_mode_check
      check (forced_mode is null or forced_mode in ('together', 'separate'));
  end if;
end $$;

-- Retitle/tag the existing seeded templates onto the 6 activities. Several
-- templates can share one activity_key (e.g. every Home workouts habit) —
-- that's expected; activity_key groups them for matching, it doesn't
-- deduplicate the picker.
update public.challenge_templates set
  activity_key = 'running', metric_type = 'distance', unit = 'km', default_target = 1,
  beginner_options = '[{"value":1,"label":"1 km"},{"value":2,"label":"2 km"},{"value":3,"label":"3 km"},{"value":null,"label":"Not sure"}]'::jsonb
where slug = 'onboarding-run-1-mile';

update public.challenge_templates set
  activity_key = 'home_workouts', metric_type = 'reps', unit = 'reps', default_target = 20,
  beginner_options = '[{"value":10,"label":"10 reps"},{"value":15,"label":"15 reps"},{"value":20,"label":"20 reps"},{"value":null,"label":"Not sure"}]'::jsonb,
  forced_mode = 'separate'
where slug = 'onboarding-pushups-20';

update public.challenge_templates set
  activity_key = 'yoga', metric_type = 'duration', unit = 'min', default_target = 15,
  beginner_options = '[{"value":10,"label":"10 min"},{"value":15,"label":"15 min"},{"value":20,"label":"20 min"},{"value":null,"label":"Not sure"}]'::jsonb
where slug = 'onboarding-yoga-15min';

update public.challenge_templates set
  activity_key = 'walking', metric_type = 'duration', unit = 'min', default_target = 10,
  beginner_options = '[{"value":10,"label":"10 min"},{"value":15,"label":"15 min"},{"value":20,"label":"20 min"},{"value":null,"label":"Not sure"}]'::jsonb
where slug in ('onboarding-winddown-walk', 'onboarding-walk-10min', 'onboarding-walk-outside');

update public.challenge_templates set
  activity_key = 'home_workouts', metric_type = 'duration', unit = 'min', default_target = 5,
  beginner_options = '[{"value":5,"label":"5 min"},{"value":10,"label":"10 min"},{"value":15,"label":"15 min"},{"value":null,"label":"Not sure"}]'::jsonb,
  forced_mode = 'separate'
where slug in ('onboarding-stretch-before-bed', 'onboarding-morning-stretch');

-- Cycling and Badminton have no existing template — neither goal-derived
-- habit needed them before now. Added inactive (is_active=false) so they
-- don't appear in the goal-driven Step 1 picker; the target/cadence screen
-- and Find only need the row to exist as an activity, not to be pickable
-- from onboarding yet.
insert into public.challenge_templates
  (title, slug, category, duration_days, difficulty, summary, description, sort_order,
   proof_type, is_active, activity_key, metric_type, unit, default_target, beginner_options)
values
  ('Cycling', 'activity-cycling', 'movement', 7, 'beginner',
   'A ride a day, whatever distance you''re starting from.',
   'A ride a day, whatever distance you''re starting from.', 15, 'tap', false,
   'cycling', 'distance', 'km', 5,
   '[{"value":3,"label":"3 km"},{"value":5,"label":"5 km"},{"value":10,"label":"10 km"},{"value":null,"label":"Not sure"}]'::jsonb),
  ('Badminton', 'activity-badminton', 'movement', 7, 'beginner',
   'A session with your partner, court booked or found.',
   'A session with your partner, court booked or found.', 16, 'tap', false,
   'badminton', 'duration', 'min', 30,
   '[{"value":20,"label":"20 min"},{"value":30,"label":"30 min"},{"value":45,"label":"45 min"},{"value":null,"label":"Not sure"}]'::jsonb)
on conflict (slug) do nothing;

update public.challenge_templates
set forced_mode = 'together'
where slug = 'activity-badminton';

-- ============================================================
-- 3. user_challenges — capability / commitment / cadence
--
-- capability_value stays null for a beginner on purpose (spec: never a
-- guessed capability). beginner_start_value carries their chosen starting
-- point instead. commitment_value is what the daily check-in is measured
-- against. days_per_week defaults to 7 (daily) to match today's implicit
-- behaviour for every existing row. mode defaults to 'separate', the lower-
-- friction default; forced activities override it client-side from the
-- template's forced_mode.
-- ============================================================
alter table public.user_challenges
  add column if not exists capability_value numeric,
  add column if not exists beginner_start_value numeric,
  add column if not exists commitment_value numeric,
  add column if not exists days_per_week int not null default 7,
  add column if not exists mode text not null default 'separate';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'user_challenges_days_per_week_check'
  ) then
    alter table public.user_challenges
      add constraint user_challenges_days_per_week_check
      check (days_per_week in (3, 4, 5, 7));
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'user_challenges_mode_check'
  ) then
    alter table public.user_challenges
      add constraint user_challenges_mode_check
      check (mode in ('together', 'separate'));
  end if;
end $$;
