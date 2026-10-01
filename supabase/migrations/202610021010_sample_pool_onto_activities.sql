-- The sample pool's remaining habits move onto the six activities.
--
-- 202610020900 moved every challenge that HAD an activity. It left 406 on
-- habits with none: water, breathing, journaling, caffeine and the three named
-- programmes. Those were left alone because there was no activity to move a
-- real person to without choosing for them.
--
-- Checked on 1 October: all 406 belong to @choner.test accounts, the seeded
-- sample pool. Not one real user is on a retired habit. The pool exists so a
-- tester who taps Find has someone to be matched with, and nobody can pick
-- those habits any more, so 406 of 870 sample accounts were waiting for a
-- match that could never come.
--
-- They are spread to even out the pool, which had nobody on Jogging or
-- Cycling at all:
--
--   before   running 62   jogging 0     walking 176   cycling 0     yoga 58    workouts 180
--   after    running 120  jogging 116   walking 176   cycling 116   yoga 174   workouts 180
--
-- GUARDED BY EMAIL DOMAIN. A real account on one of these habits, now or
-- later, is not touched by this: choosing someone's activity for them is not
-- something a migration should do. They change it themselves on the Create a
-- commitment screen, which is open to anyone not yet searching.
--
-- legacy_template_id records where each row came from, as in 202610020900.
-- (It is not a foreign key. See 202610020940 for why it must never be one.)

with mapping(old_slug, new_slug) as (
  values
    ('7-day-energy-reset',         'activity-jogging'),
    ('consistency-builder',        'activity-jogging'),
    ('sleep-better-sprint',        'activity-cycling'),
    ('onboarding-journaling',      'activity-cycling'),
    ('onboarding-morning-water',   'activity-running'),
    ('onboarding-deep-breathing',  'activity-yoga'),
    ('onboarding-no-caffeine-2pm', 'activity-yoga')
),
moved as (
  update public.user_challenges uc
  set legacy_template_id = coalesce(uc.legacy_template_id, uc.challenge_template_id),
      challenge_template_id = nw.id,
      -- These habits had no unit, so there is no amount to carry over.
      commitment_value = null,
      capability_value = null,
      beginner_start_value = null
  from public.challenge_templates old
  join mapping mp on mp.old_slug = old.slug
  join public.challenge_templates nw on nw.slug = mp.new_slug
  where old.id = uc.challenge_template_id
    and uc.custom_habit_title is null
    and uc.status in ('active', 'pending', 'paused')
    and exists (select 1 from auth.users au
                where au.id = uc.user_id and au.email like '%@choner.test')
  returning uc.id, uc.challenge_template_id as new_template, old.title as old_title
),
requests as (
  update public.partner_match_requests r
  set challenge_template_id = m.new_template, updated_at = now()
  from moved m
  where r.user_challenge_id = m.id and r.status = 'waiting'
  returning r.id
)
update public.challenge_tasks ct
set title = t.title
from moved m
join public.challenge_templates t on t.id = m.new_template
where ct.user_challenge_id = m.id and ct.title = m.old_title;
