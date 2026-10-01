-- SCHEMA_CHALLENGES.md §1: the streak, as something the app can draw.
--
-- No streak table (§3). A streak is target_sessions on the challenge plus the
-- session rows that count toward it, and both already exist. What was missing
-- is a way to SET the target and a read that turns the rows into circles.
--
--   set_streak_target()  the 12 in "a 12 session streak". Asked once, right
--                        after the first plan is accepted; raised later to
--                        extend. Personal: your partner has their own.
--   get_streak()         the row of circles, in order.
--
-- A circle is one planned session:
--
--   done      completed by both, or a miss that was repaired
--   missed    the day passed. `repairable` says whether it can still be made
--             up; while it can, the circle has NOT resolved
--   planned   confirmed and still ahead. Carries its day
--   ahead     not planned yet
--
-- Always exactly `target` circles: a miss does not add one and a repair fills
-- the circle it repairs (repair sessions are not circles of their own).
--
-- COMPLETE WHEN ALL N RESOLVE, NOT WHEN N FILL (§1). Resolved is done, or
-- missed and no longer repairable. So 11 of 12 is a real ending, and a streak
-- with an unrepaired miss cannot be stranded short of its target forever.
--
-- `with_partner` is the heart: sessions completed with the CURRENT partner. A
-- different number from the streak, measuring a different thing.

create or replace function public.set_streak_target(p_user_challenge_id uuid, p_target int)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  if p_target is null or p_target < 1 or p_target > 365 then
    return jsonb_build_object('ok', false, 'reason', 'bad_value');
  end if;

  update public.user_challenges
  set target_sessions = p_target
  where id = p_user_challenge_id and user_id = v_uid;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  return jsonb_build_object('ok', true, 'target', p_target);
end;
$$;

revoke all on function public.set_streak_target(uuid, int) from public, anon;
grant execute on function public.set_streak_target(uuid, int) to authenticated;

create or replace function public.get_streak(p_user_challenge_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  uc record;
  s record;
  v_state text;
  v_repair text;
  v_circles jsonb := '[]'::jsonb;
  v_n int := 0;
  v_done int := 0;
  v_resolved int := 0;
  v_cap int;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select id, user_id, target_sessions, days_per_week, partner_user_id, partner_state
    into uc
  from public.user_challenges
  where id = p_user_challenge_id and user_id = v_uid;
  if uc.id is null then
    raise exception 'challenge not found';
  end if;

  -- With no target yet there is no row to draw, but the sessions so far are
  -- still worth showing; cap at something sane.
  v_cap := coalesce(uc.target_sessions, 60);

  for s in
    select p.id, p.status, p.starts_at, p.due_at
    from public.pair_plans p
    where p_user_challenge_id in (p.challenge_a, p.challenge_b)
      and v_uid in (p.user_a, p.user_b)
      and not p.is_repair
      and p.status in ('completed', 'missed', 'confirmed', 'verified')
    order by coalesce(p.starts_at, p.due_at, p.created_at)
  loop
    exit when v_n >= v_cap;
    v_n := v_n + 1;

    if s.status = 'completed' then
      v_state := 'done';
      v_done := v_done + 1; v_resolved := v_resolved + 1;
      v_circles := v_circles || jsonb_build_object('state', 'done', 'at', s.starts_at, 'plan_id', s.id);
    elsif s.status = 'missed' then
      v_repair := public.repair_state(s.id);
      if v_repair = 'repaired' then
        v_done := v_done + 1; v_resolved := v_resolved + 1;
        v_circles := v_circles || jsonb_build_object('state', 'done', 'at', s.starts_at, 'plan_id', s.id, 'repaired', true);
      else
        if v_repair not in ('owed', 'in_progress') then
          v_resolved := v_resolved + 1;
        end if;
        v_circles := v_circles || jsonb_build_object(
          'state', 'missed', 'at', s.starts_at, 'plan_id', s.id,
          'repairable', v_repair in ('owed', 'in_progress'));
      end if;
    else
      v_circles := v_circles || jsonb_build_object('state', 'planned', 'at', s.starts_at, 'plan_id', s.id);
    end if;
  end loop;

  -- The rest of the row, when there is a row.
  if uc.target_sessions is not null then
    while v_n < uc.target_sessions loop
      v_n := v_n + 1;
      v_circles := v_circles || jsonb_build_object('state', 'ahead');
    end loop;
  end if;

  return jsonb_build_object(
    'target', uc.target_sessions,
    'cadence', uc.days_per_week,
    'circles', v_circles,
    'done', v_done,
    'resolved', v_resolved,
    'complete', uc.target_sessions is not null and v_resolved >= uc.target_sessions,
    'with_partner', case when uc.partner_state = 'partnered' and uc.partner_user_id is not null then (
      select count(*) from public.pair_plans p
      where p.status = 'completed'
        and least(p.user_a, p.user_b) = least(v_uid, uc.partner_user_id)
        and greatest(p.user_a, p.user_b) = greatest(v_uid, uc.partner_user_id)
    ) else 0 end
  );
end;
$$;

revoke all on function public.get_streak(uuid) from public, anon;
grant execute on function public.get_streak(uuid) to authenticated;
