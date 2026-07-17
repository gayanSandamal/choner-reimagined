-- Onboarding rewrite (Screens 1-7 final spec):
--   1. Seed the four partner-challenge templates suggested on Screen 7,
--      keyed by slug so re-running is a no-op.
--   2. start_user_challenge now creates a single daily task — the habit
--      itself — instead of three generic tasks; with one specialized habit
--      per challenge, filler tasks like "Hydration target" read as noise
--      under unrelated habits (e.g. "No screens 30 minutes before bed").

insert into public.challenge_templates
  (title, slug, category, duration_days, difficulty, summary, description, sort_order)
values
  ('Walk for 10 minutes every day', 'onboarding-walk-10min', 'movement', 7, 'beginner',
   'A short daily walk to build an active routine.',
   'A short daily walk to build an active routine.', 1),
  ('No screens 30 minutes before bed', 'onboarding-no-screens', 'sleep', 7, 'beginner',
   'Wind down properly so you rest and recover well.',
   'Wind down properly so you rest and recover well.', 2),
  ('5 minutes of deep breathing each morning', 'onboarding-deep-breathing', 'stress', 7, 'beginner',
   'Start the day calmer with a short breathing practice.',
   'Start the day calmer with a short breathing practice.', 3),
  ('Drink a glass of water first thing every morning', 'onboarding-morning-water', 'energy', 7, 'beginner',
   'A tiny morning win that keeps your energy steady.',
   'A tiny morning win that keeps your energy steady.', 4)
on conflict (slug) do nothing;

create or replace function public.start_user_challenge(
  p_user_id uuid,
  p_template_id uuid,
  p_accountability_mode text
) returns uuid
language plpgsql
security definer
as $$
declare
  v_user_challenge_id uuid;
  v_title text;
begin
  insert into public.user_challenges(user_id, challenge_template_id, accountability_mode, status, ends_at)
  values (p_user_id, p_template_id, p_accountability_mode, 'active', now() + interval '7 days')
  returning id into v_user_challenge_id;

  select title into v_title from public.challenge_templates where id = p_template_id;

  insert into public.challenge_tasks(user_challenge_id, title, sort_order, due_window)
  values (v_user_challenge_id, coalesce(v_title, 'Complete today''s habit'), 1, 'anytime');

  return v_user_challenge_id;
end;
$$;
