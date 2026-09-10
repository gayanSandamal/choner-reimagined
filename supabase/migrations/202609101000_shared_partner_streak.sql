-- get_user_insights' streak walk-back only ever checked the calling user's own
-- task_checkins, so it kept incrementing for one partner even when the other
-- partner never checked in. The UI already implies a joint streak ("Streak
-- alive" copy in challenges.tsx gates on both partners), the number itself
-- didn't enforce it.
--
-- It also walked back using current_date / completed_at::date, i.e. the
-- server's implicit UTC day rather than each person's own local day - the
-- same bug class already fixed for get_partner_status/get_today_status in
-- 202608211300_local_day_and_nudge_state.sql (disagrees for 5.5 hours/day in
-- Asia/Colombo, where most current users are). Fixing the partner-awareness
-- without also fixing the day boundary would just trade one silent
-- mismatch for another, so both move together here.
create or replace function public.get_user_insights(p_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
as $$
declare
  v_completion_rate int;
  v_streak int := 0;
  v_best_time text;
  v_consistency int;
  v_day date;
  v_done boolean;
  v_my_tz text;
  v_partner_id uuid;
  v_partner_state text;
  v_partner_tz text;
  v_partner_done boolean;
begin
  -- completion rate over last 30 days = checkins / (active days)
  select coalesce(
    round(100.0 * count(distinct date_trunc('day', tc.completed_at))::numeric
      / nullif(greatest(1, least(30, extract(day from (now() - min(uc.started_at)))::int)), 0)
    , 0)::int, 0)
  into v_completion_rate
  from public.user_challenges uc
  left join public.task_checkins tc on tc.user_challenge_id = uc.id
    and tc.completed_at >= now() - interval '30 days'
  where uc.user_id = p_user_id;

  -- Resolve the caller's own timezone and current partner, the same way
  -- get_partner_status does.
  select coalesce(timezone, 'UTC') into v_my_tz
  from public.profiles where id = p_user_id;

  select partner_user_id, partner_state into v_partner_id, v_partner_state
  from public.user_challenges
  where user_id = p_user_id and status = 'active'
  order by started_at desc
  limit 1;

  if v_partner_id is not null and v_partner_state = 'partnered' then
    select coalesce(timezone, 'UTC') into v_partner_tz
    from public.profiles where id = v_partner_id;
  end if;

  -- streak: walk back day-by-day (in the caller's own local calendar) while
  -- the caller checked in that day AND, if partnered, the partner also
  -- checked in on that same day number in their own local calendar. "Their
  -- day for their progress, my day for my rate limit" - same pattern
  -- get_partner_status already uses for the two halves of a pair.
  v_day := (now() at time zone v_my_tz)::date;
  loop
    select exists (
      select 1 from public.task_checkins tc
      join public.user_challenges uc on uc.id = tc.user_challenge_id
      where uc.user_id = p_user_id
        and tc.status = 'completed'
        and (tc.completed_at at time zone v_my_tz)::date = v_day
    ) into v_done;

    if v_done and v_partner_id is not null and v_partner_state = 'partnered' then
      select exists (
        select 1 from public.task_checkins tc2
        join public.user_challenges uc2 on uc2.id = tc2.user_challenge_id
        where uc2.user_id = v_partner_id
          and tc2.status = 'completed'
          and (tc2.completed_at at time zone coalesce(v_partner_tz, 'UTC'))::date = v_day
      ) into v_partner_done;
      v_done := v_partner_done;
    end if;

    exit when not v_done;
    v_streak := v_streak + 1;
    v_day := v_day - 1;
  end loop;

  -- best time of day: bucket completed_at hours
  select case
           when h between 5 and 11 then 'morning'
           when h between 12 and 16 then 'afternoon'
           when h between 17 and 21 then 'evening'
           else 'late night'
         end
  into v_best_time
  from (
    select extract(hour from tc.completed_at)::int as h, count(*) as c
    from public.task_checkins tc
    join public.user_challenges uc on uc.id = tc.user_challenge_id
    where uc.user_id = p_user_id
      and tc.completed_at >= now() - interval '60 days'
    group by 1
    order by c desc
    limit 1
  ) t;

  -- consistency = completion_rate weighted by streak presence
  v_consistency := least(100, greatest(0, coalesce(v_completion_rate, 0) + least(20, v_streak * 2)));

  return jsonb_build_object(
    'consistency_score', v_consistency,
    'best_time_of_day', coalesce(v_best_time, 'morning'),
    'streak_days', v_streak,
    'completion_rate', coalesce(v_completion_rate, 0)
  );
end;
$$;
