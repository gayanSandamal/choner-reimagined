-- get_repair_debt().lost counted only the misses BEFORE the open debt.
--
-- 202610012100 returned from inside its loop the moment it found the open
-- debt, so a second miss later in the same week, which is the usual order
-- (first miss owed, second lost), was never counted and `lost` read 0. Found
-- testing on 1 October. The loop now runs to the end and reports the oldest
-- open debt with the full count. Nothing else changed.

create or replace function public.get_repair_debt(p_user_challenge_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  m record;
  v_state text;
  v_week_end timestamptz;
  v_lost int := 0;
  v_debt jsonb;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  for m in
    select p.* from public.pair_plans p
    where p_user_challenge_id in (p.challenge_a, p.challenge_b)
      and v_uid in (p.user_a, p.user_b)
      and p.status = 'missed' and not p.is_repair
    order by coalesce(p.starts_at, p.due_at, p.updated_at)
  loop
    v_state := public.repair_state(m.id);
    if v_state = 'lost' then
      v_lost := v_lost + 1;
    elsif v_state in ('owed', 'in_progress') and v_debt is null then
      -- The oldest open debt: with a two-week window there can briefly be two.
      v_week_end := public.pair_week_end(coalesce(m.starts_at, m.due_at, m.updated_at), m.user_a, m.user_b);
      v_debt := jsonb_build_object(
        'owed', true,
        'state', v_state,
        'missed_plan_id', m.id,
        'missed_at', coalesce(m.starts_at, m.due_at),
        -- Past this, "this week" is no longer on offer and it has rolled.
        'this_week_ends_at', v_week_end,
        'repair_by', public.pair_week_end(v_week_end + interval '1 hour', m.user_a, m.user_b),
        'preference', m.repair_preference,
        'when', case when now() >= v_week_end then 'next_week'
                     else coalesce(m.repair_preference, 'this_week') end,
        'repair_plan_id', (select r.id from public.pair_plans r
                           where r.repairs_plan_id = m.id
                             and r.status in ('planning', 'confirmed', 'verified')
                           order by r.created_at desc limit 1)
      );
    end if;
  end loop;

  return coalesce(v_debt, jsonb_build_object('owed', false)) || jsonb_build_object('lost', v_lost);
end;
$$;

revoke all on function public.get_repair_debt(uuid) from public, anon;
grant execute on function public.get_repair_debt(uuid) to authenticated;
