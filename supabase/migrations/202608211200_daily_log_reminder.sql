-- Your own reminder to log, before the deadline rather than after it.
--
-- streak_risk has been mapped in send-push's KIND_PREF_MAP and given an icon in
-- the notifications modal since the beginning, and nothing has ever emitted it.
-- The settings screen has been advertising "Reminders before your streak is at
-- risk" for a feature that did not exist.
--
-- WHY BEFORE THE DEADLINE
--
-- The missed-day spec is explicit that the person who misses gets no push --
-- only their partner is told -- and settings/deadline.tsx promises exactly that
-- in so many words. A reminder that fires BEFORE the deadline doesn't break
-- that promise, because it isn't about a miss: at that point nothing has been
-- missed and the whole point is that it still can be avoided. After the
-- deadline the silence stands, and sweep_missed_checkins takes over.
--
-- The window is [deadline - 2h, deadline), floored at 08:00. Both ends matter:
-- fire too early and it is noise about a day with hours left in it; fire after
-- the deadline and it stops being a reminder and starts being a verdict.
--
-- This one goes to everybody with a live challenge, not just partnered users.
-- Someone doing this alone has nobody who will be told they slipped, which
-- makes their own reminder the only thing standing between them and a quiet
-- broken streak.

alter table public.daily_status
  add column if not exists reminded_at timestamptz;

create or replace function public.sweep_daily_reminders()
returns integer
language plpgsql
security definer
set search_path = public, net, extensions
as $$
declare
  rec record;
  d date;
  v_local_now timestamp;
  v_deadline_ts timestamp;
  v_remind_ts timestamp;
  v_floor_ts timestamp;
  v_probe date;
  v_guard integer;
  v_streak integer;
  v_title text;
  v_body text;
  v_key text;
  v_url text;
  v_sent integer := 0;
begin
  select value into v_key from public.app_config where key = 'service_role_key';
  select value into v_url from public.app_config where key = 'functions_base_url';

  if v_key is null or v_url is null then
    raise notice 'sweep_daily_reminders: config missing, nothing sent';
    return 0;
  end if;

  for rec in
    select uc.id as challenge_id,
           uc.user_id as owner_id,
           coalesce(p.timezone, 'UTC') as tz,
           coalesce(p.daily_deadline, time '20:00') as deadline,
           coalesce(uc.custom_habit_title, ct.title, 'Today''s habit') as habit,
           uc.started_at,
           uc.ends_at
    from public.user_challenges uc
    join public.profiles p on p.id = uc.user_id
    left join public.challenge_templates ct on ct.id = uc.challenge_template_id
    where uc.status = 'active'
  loop
    v_local_now := now() at time zone rec.tz;
    d := v_local_now::date;

    -- Only ever today. A reminder to beat a deadline that passed yesterday is
    -- not a reminder.
    if rec.started_at is not null
       and d < (rec.started_at at time zone rec.tz)::date then
      continue;
    end if;
    if rec.ends_at is not null
       and d > (rec.ends_at at time zone rec.tz)::date then
      continue;
    end if;

    if exists (
      select 1 from public.daily_status ds
      where ds.user_challenge_id = rec.challenge_id
        and ds.local_date = d
        and ds.reminded_at is not null
    ) then
      continue;
    end if;

    -- Already done today: the only good reason to say nothing.
    if exists (
      select 1
      from public.task_checkins tc
      join public.challenge_tasks ct on ct.id = tc.challenge_task_id
      where ct.user_challenge_id = rec.challenge_id
        and tc.status = 'completed'
        and ((tc.completed_at at time zone rec.tz)::date = d)
    ) then
      continue;
    end if;

    v_deadline_ts := d + rec.deadline;
    v_remind_ts := v_deadline_ts - interval '2 hours';
    v_floor_ts := d + time '08:00';

    -- An unusually early deadline must not turn into a pre-dawn push.
    if v_remind_ts < v_floor_ts then
      v_remind_ts := v_floor_ts;
    end if;

    -- A deadline at or before 08:00 leaves no room for a reminder that is both
    -- before it and after breakfast. Say nothing rather than say it late.
    if v_remind_ts >= v_deadline_ts then
      continue;
    end if;

    if v_local_now < v_remind_ts or v_local_now >= v_deadline_ts then
      continue;
    end if;

    -- Consecutive days ending yesterday. This is what gives the reminder its
    -- weight -- "log it" is a chore, "your 4-day streak" is a reason.
    v_streak := 0;
    v_probe := d - 1;
    v_guard := 0;
    loop
      v_guard := v_guard + 1;
      exit when v_guard > 60;
      exit when rec.started_at is not null
                and v_probe < (rec.started_at at time zone rec.tz)::date;
      exit when not exists (
        select 1
        from public.task_checkins tc
        join public.challenge_tasks ct on ct.id = tc.challenge_task_id
        where ct.user_challenge_id = rec.challenge_id
          and tc.status = 'completed'
          and ((tc.completed_at at time zone rec.tz)::date = v_probe)
      );
      v_streak := v_streak + 1;
      v_probe := v_probe - 1;
    end loop;

    if v_streak > 0 then
      v_title := 'Your ' || v_streak || '-day streak is still open';
    else
      v_title := 'Today is still open';
    end if;
    v_body := rec.habit || ' — log it before '
              || to_char(rec.deadline, 'FMHH12:MI') || lower(to_char(rec.deadline, 'am')) || '.';

    perform net.http_post(
      url := v_url || '/send-push',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_key
      ),
      body := jsonb_build_object(
        'userId', rec.owner_id,
        'kind', 'streak_risk', -- maps to the streak_alerts opt-out
        'title', v_title,
        'body', v_body,
        'route', '/(tabs)/challenges'
      )
    );

    insert into public.daily_status (user_challenge_id, local_date, reminded_at)
    values (rec.challenge_id, d, now())
    on conflict (user_challenge_id, local_date)
    do update set reminded_at = now(), updated_at = now();

    v_sent := v_sent + 1;
  end loop;

  return v_sent;
end;
$$;

revoke all on function public.sweep_daily_reminders() from public, anon, authenticated;

-- Hourly for the same reason the missed-day sweep is: deadlines are per-user
-- local times spread across timezones, so a single daily run would only ever be
-- correct for one offset. Offset to :15 so the two sweeps never contend.
do $$
begin
  perform cron.unschedule('choner-daily-reminders');
exception when others then
  null; -- not scheduled yet
end $$;

select cron.schedule(
  'choner-daily-reminders',
  '15 * * * *',
  $cron$select public.sweep_daily_reminders()$cron$
);
