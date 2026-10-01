-- The picker offers the six activities, and nothing else.
--
-- Running, Jogging, Walking, Cycling, Yoga, Workouts. Decided 26 September
-- ("the challenge step shows only the 6 MVP activities") and repeated in every
-- plan since. The database still offered the August habit list: "Run 1 mile",
-- "20 push-ups", "Journaling", "No caffeine after 2pm", three different walks.
--
-- Three things, and the third is the one that cannot be skipped:
--
-- 1. FOUR NEW TEMPLATES. Running, Walking, Yoga and Workouts as activities,
--    beside the Jogging and Cycling rows that already exist. Workouts is
--    measured in minutes, and Walking in distance, as decided.
--
-- 2. EVERYTHING ELSE IS RETIRED from the picker (is_active = false). Retired,
--    not deleted: challenges still point at those rows, and getTemplates()
--    already filters on is_active.
--
-- 3. EXISTING ACTIVITY CHALLENGES MOVE to the canonical template for their
--    activity. Matching pairs people by template id
--    (features/challenges/matching.ts: "different habit"), so leaving 61
--    people on "Run 1 mile" while every new runner lands on "Running" would
--    split one pool into two that can never meet. The three walking habits and
--    the three workout habits collapse into one pool each for the same reason.
--
--    The old template is kept on the row in legacy_template_id, so this can be
--    undone per row. Where the unit changes (push-ups in reps become Workouts
--    in minutes; a walk in minutes becomes Walking in km) the stored amounts
--    are cleared rather than relabelled: 20 reps is not 20 minutes. They are
--    asked again at the first plan, which is where amounts are agreed now.
--
-- NOT touched: challenges on a habit with no activity (water, breathing,
-- journaling, caffeine, the three named programmes). There is no activity to
-- move them to. They keep running on their retired template and still match
-- each other.

alter table public.user_challenges
  add column if not exists legacy_template_id uuid references public.challenge_templates(id) on delete set null;

comment on column public.user_challenges.legacy_template_id is
  'The habit template this challenge was on before 202610020900 moved it to '
  'its activity. Null for a challenge that was never moved.';

insert into public.challenge_templates
  (title, slug, category, duration_days, difficulty, summary, description, sort_order,
   proof_type, is_active, activity_key, metric_type, unit, default_target, beginner_options)
values
  ('Running', 'activity-running', 'movement', 7, 'beginner',
   'A run, at whatever distance you are starting from.',
   'A run, at whatever distance you are starting from.', 10, 'tap', true,
   'running', 'distance', 'km', 3,
   '[{"value":1,"label":"1 km"},{"value":3,"label":"3 km"},{"value":5,"label":"5 km"},{"value":null,"label":"Not sure"}]'::jsonb),
  ('Walking', 'activity-walking', 'movement', 7, 'beginner',
   'A walk, long enough to count.',
   'A walk, long enough to count.', 12, 'tap', true,
   'walking', 'distance', 'km', 2,
   '[{"value":1,"label":"1 km"},{"value":2,"label":"2 km"},{"value":3,"label":"3 km"},{"value":null,"label":"Not sure"}]'::jsonb),
  ('Yoga', 'activity-yoga', 'movement', 7, 'beginner',
   'Time on the mat to move and reset.',
   'Time on the mat to move and reset.', 14, 'tap', true,
   'yoga', 'duration', 'min', 15,
   '[{"value":10,"label":"10 min"},{"value":15,"label":"15 min"},{"value":20,"label":"20 min"},{"value":null,"label":"Not sure"}]'::jsonb),
  ('Workouts', 'activity-workouts', 'movement', 7, 'beginner',
   'A workout of your own choosing, measured in minutes.',
   'A workout of your own choosing, measured in minutes.', 15, 'tap', true,
   'home_workouts', 'duration', 'min', 20,
   '[{"value":10,"label":"10 min"},{"value":20,"label":"20 min"},{"value":30,"label":"30 min"},{"value":null,"label":"Not sure"}]'::jsonb)
on conflict (slug) do nothing;

-- The order the six are listed in everywhere.
update public.challenge_templates set sort_order = 11 where slug = 'activity-jogging';
update public.challenge_templates set sort_order = 13 where slug = 'activity-cycling';

-- Only the six are offered.
update public.challenge_templates
set is_active = (slug in ('activity-running', 'activity-jogging', 'activity-walking',
                          'activity-cycling', 'activity-yoga', 'activity-workouts'));

-- Move live challenges to their activity. Idempotent: a row already on a
-- canonical template is not matched by the join.
with canon as (
  select activity_key, id, unit from public.challenge_templates
  where slug in ('activity-running', 'activity-walking', 'activity-yoga', 'activity-workouts')
),
moved as (
  update public.user_challenges uc
  set legacy_template_id = coalesce(uc.legacy_template_id, uc.challenge_template_id),
      challenge_template_id = c.id,
      commitment_value     = case when old.unit is distinct from c.unit then null else uc.commitment_value end,
      capability_value     = case when old.unit is distinct from c.unit then null else uc.capability_value end,
      beginner_start_value = case when old.unit is distinct from c.unit then null else uc.beginner_start_value end
  from public.challenge_templates old
  join canon c on c.activity_key = old.activity_key
  where old.id = uc.challenge_template_id
    and old.id <> c.id
    and uc.custom_habit_title is null
    and uc.status in ('active', 'pending', 'paused')
  returning uc.id, uc.challenge_template_id as new_template, old.title as old_title
),
-- The pool is keyed on the request's own copy of the template id.
requests as (
  update public.partner_match_requests r
  set challenge_template_id = m.new_template, updated_at = now()
  from moved m
  where r.user_challenge_id = m.id and r.status = 'waiting'
  returning r.id
)
-- The daily task carried the habit's name. Only where it still does: a task
-- someone renamed is theirs.
update public.challenge_tasks ct
set title = t.title
from moved m
join public.challenge_templates t on t.id = m.new_template
where ct.user_challenge_id = m.id and ct.title = m.old_title;
