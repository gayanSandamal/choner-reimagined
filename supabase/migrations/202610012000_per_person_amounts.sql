-- The amount is per person. The cadence is shared.
--
-- Decided in the 1 October testing pass (DECISIONS_LOG, item 7): losing a match
-- because one wants 5 km and the other 3 km is a waste of a match. You set
-- yours at the first plan, they set theirs, and the card reads
-- "You 5 km · Gayan 3 km". A circle still fills only when both finish THEIR
-- number.
--
-- The storage was already right: 202609231700 gave each person their own
-- pair_plan_members.distance_answer. What stood in the way was the rule on
-- top of it. Two different answers were a conflict to negotiate down to one
-- shared pair_plans.distance, and confirm_plan() refused until that existed.
--
-- So nothing is added here. Two functions are re-issued from 202609231700:
--
--   set_distance_answer()  different answers settle the step instead of
--                          opening a negotiation. pair_plans.distance is set
--                          only when the two match
--   confirm_plan()         requires both to have ANSWERED, not to have agreed
--
-- get_pair_plan() already returns both answers (`me` and `them`), so the
-- client needs no new field. propose_plan_value('distance', ...) still works
-- for a build that negotiates; it simply is no longer required.

create or replace function public.set_distance_answer(p_plan_id uuid, p_value text)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid(); p public.pair_plans; v_theirs text;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  p := public.my_plan_member(p_plan_id);
  if p.id is null or p.status <> 'planning' then return jsonb_build_object('ok', false, 'reason', 'no_plan'); end if;
  if not public.plan_distance_ok(p_value) then return jsonb_build_object('ok', false, 'reason', 'bad_value'); end if;

  update public.pair_plan_members set distance_answer = p_value where plan_id = p.id and user_id = v_uid;
  select distance_answer into v_theirs from public.pair_plan_members where plan_id = p.id and user_id <> v_uid;

  -- pair_plans.distance is the SHARED amount and is only set when the two
  -- answers are the same, which is what lets a card collapse to "5 km each
  -- time". Different answers are no longer a conflict to negotiate: each
  -- person keeps their own number in pair_plan_members.distance_answer.
  update public.pair_plans
  set distance = case when v_theirs = p_value then p_value else null end, updated_at = now()
  where id = p.id;

  -- `agreed` now means "this step is settled", i.e. both have answered.
  -- `conflict` stays in the payload, always false, for a client built before
  -- this change.
  return jsonb_build_object('ok', true, 'agreed', v_theirs is not null, 'conflict', false,
                            'same', v_theirs = p_value);
end; $$;

create or replace function public.confirm_plan(p_plan_id uuid)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid(); p public.pair_plans; v_other uuid; v_both boolean; v_name text;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  p := public.my_plan_member(p_plan_id);
  if p.id is null or p.status <> 'planning' then return jsonb_build_object('ok', false, 'reason', 'no_plan'); end if;
  -- The amount is settled when BOTH have answered, whether or not the two
  -- answers match (1 October: the amount is per person, the cadence is shared).
  if (p.distance is null and exists (
        select 1 from public.pair_plan_members m
        where m.plan_id = p.id and m.distance_answer is null))
     or p.mode is null or p.starts_at is null
     or (p.mode = 'together' and p.meeting_location_status not in ('agreed', 'founder_assisted')) then
    return jsonb_build_object('ok', false, 'reason', 'not_agreed');
  end if;

  update public.pair_plan_members set confirmed_at = coalesce(confirmed_at, now())
  where plan_id = p.id and user_id = v_uid;
  v_other := case when p.user_a = v_uid then p.user_b else p.user_a end;
  select confirmed_at is not null into v_both from public.pair_plan_members where plan_id = p.id and user_id = v_other;

  if v_both then
    update public.pair_plans set status = 'confirmed', confirmed_at = now(), updated_at = now() where id = p.id;
    select split_part(coalesce(full_name, 'Your partner'), ' ', 1) into v_name from public.profiles where id = v_uid;
    perform public.notify_user(v_other, 'plan_confirmed', 'It''s on',
      v_name || ' is in too.', '/(tabs)/challenges');
  end if;
  return jsonb_build_object('ok', true, 'both', v_both);
end; $$;

revoke all on function public.set_distance_answer(uuid, text) from public, anon;
grant execute on function public.set_distance_answer(uuid, text) to authenticated;
revoke all on function public.confirm_plan(uuid) from public, anon;
grant execute on function public.confirm_plan(uuid) to authenticated;
