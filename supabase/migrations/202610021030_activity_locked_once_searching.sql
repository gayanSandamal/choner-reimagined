-- The activity can be changed until a search starts, and not after.
--
-- "Locked the moment partner_state is anything but solo — searching, invited,
-- matched, partnered." The card has said "You can change this until you start
-- searching for a match" for a week, and the rule existed only as that
-- sentence: set_challenge_habit() would repoint a challenge that was already
-- in the pool, or already partnered, and leave the request and the partner
-- pointing at an activity the person was no longer doing.
--
-- Re-issued from 202608131000 (the live body, checked by hash) with:
--   - the lock
--   - amounts cleared when the UNIT changes. 5 km of running is not 5 minutes
--     of yoga; they are asked again at the first plan, which is where amounts
--     are agreed now
--   - exercises cleared when the new activity is not Workouts, so a stale list
--     cannot follow someone to another activity

create or replace function public.set_challenge_habit(
  p_user_challenge_id uuid,
  p_template_id uuid,
  p_custom_habit_title text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_custom text := nullif(btrim(coalesce(p_custom_habit_title, '')), '');
  v_title text;
  v_new_unit text;
  v_new_key text;
  v_owner uuid;
  v_state text;
  v_old_template uuid;
  v_old_unit text;
begin
  select user_id, partner_state, challenge_template_id
    into v_owner, v_state, v_old_template
  from public.user_challenges
  where id = p_user_challenge_id;

  if v_owner is null then
    raise exception 'challenge not found';
  end if;

  -- security definer: this must never let one user rewrite another's habit.
  if v_owner <> auth.uid() then
    raise exception 'not your challenge';
  end if;

  select title, unit, activity_key into v_title, v_new_unit, v_new_key
  from public.challenge_templates where id = p_template_id;
  if v_title is null then
    raise exception 'template not found';
  end if;

  -- Choosing the same thing again is not a change and is never refused.
  if v_old_template is distinct from p_template_id and v_state <> 'solo' then
    raise exception 'Locked while you''re looking for a match';
  end if;

  select unit into v_old_unit from public.challenge_templates where id = v_old_template;

  update public.user_challenges
  set challenge_template_id = p_template_id,
      custom_habit_title = v_custom,
      commitment_value     = case when v_old_unit is distinct from v_new_unit then null else commitment_value end,
      capability_value     = case when v_old_unit is distinct from v_new_unit then null else capability_value end,
      beginner_start_value = case when v_old_unit is distinct from v_new_unit then null else beginner_start_value end,
      exercises            = case when v_new_key = 'home_workouts' then exercises else '{}' end
  where id = p_user_challenge_id;

  update public.challenge_tasks
  set title = coalesce(v_custom, v_title)
  where user_challenge_id = p_user_challenge_id;
end;
$$;

revoke all on function public.set_challenge_habit(uuid, uuid, text) from public, anon;
grant execute on function public.set_challenge_habit(uuid, uuid, text) to authenticated;
