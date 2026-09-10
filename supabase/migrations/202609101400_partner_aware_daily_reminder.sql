-- sweep_daily_reminders() was a pure self-reminder with zero partner
-- awareness. The spec asked for a "local" notification enhancement, but
-- there is no client-side scheduling anywhere in this app (lib/notifications.ts
-- only does foreground-handler config, tap-routing, and push-token
-- registration) — this reminder is already a server-side pg_cron sweep +
-- remote push, which makes partner-aware copy a pure SQL change rather than
-- new client infrastructure.
--
-- "Suppressed if the user already checked in" was already handled by the
-- existing guard a few lines down (continue when the owner has a completed
-- check-in for today) — unchanged here.
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
  v_partner_tz text;
  v_partner_checked_in boolean;
  v_partner_name text;
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
           uc.ends_at,
           uc.partner_user_id as partner_id,
           uc.partner_state as partner_state
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

    -- Partner-aware: if the partner has already logged their own local today
    -- and this owner hasn't, that fact is more useful than a generic nudge.
    v_partner_checked_in := false;
    v_partner_name := null;
    if rec.partner_state = 'partnered' and rec.partner_id is not null then
      select coalesce(timezone, 'UTC'), full_name into v_partner_tz, v_partner_name
      from public.profiles where id = rec.partner_id;

      v_partner_checked_in := exists (
        select 1
        from public.task_checkins tc
        join public.challenge_tasks ct on ct.id = tc.challenge_task_id
        join public.user_challenges uc2 on uc2.id = tc.user_challenge_id
        where uc2.user_id = rec.partner_id
          and tc.status = 'completed'
          and (tc.completed_at at time zone coalesce(v_partner_tz, 'UTC'))::date
              = (now() at time zone coalesce(v_partner_tz, 'UTC'))::date
      );
    end if;

    if v_partner_checked_in then
      v_title := coalesce(nullif(split_part(v_partner_name, ' ', 1), ''), 'Your partner')
                 || ' already checked in — your turn';
    elsif v_streak > 0 then
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
