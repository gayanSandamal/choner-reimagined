-- The missed-day sweep had stopped firing entirely. This revives it.
--
-- 202608131600 retired the two-track model: every challenge is now created with
-- accountability_mode = 'solo', and the pairing moved onto partner_user_id /
-- partner_state. That migration's own comment calls accountability_mode
-- "vestigial" -- but this sweep still selected on it:
--
--   where uc.accountability_mode = 'partner'
--
-- which has matched zero rows ever since. Nothing looked broken from the
-- outside: the hourly cron job kept running and kept reporting success, because
-- returning 0 IS a success. The tell was daily_status -- not one
-- missed_notified_at row in production, meaning the feature had never once
-- fired since the model changed.
--
-- Second, quieter break in the same function: it resolved the partner through
-- challenge_invites (status = 'accepted'). Concierge-matched partners never
-- have an invite row at all -- confirm_match writes partner_user_id directly --
-- so even with the filter fixed, every matched pair would still have been
-- skipped. Reading the pairing off the challenge row covers both routes and
-- removes a join.
--
-- The timing design (grace clamp, quiet hours, challenge window, staleness
-- cut-off) is carried over untouched. It was never the problem.

create or replace function public.sweep_missed_checkins()
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
  v_notify_ts timestamp;
  v_quiet_start timestamp;
  v_past_tense boolean;
  v_name text;
  v_note text;
  v_title text;
  v_body text;
  v_key text;
  v_url text;
  v_sent integer := 0;
begin
  select value into v_key from public.app_config where key = 'service_role_key';
  select value into v_url from public.app_config where key = 'functions_base_url';

  if v_key is null or v_url is null then
    raise notice 'sweep_missed_checkins: config missing, nothing sent';
    return 0;
  end if;

  for rec in
    select uc.id as challenge_id,
           uc.user_id as owner_id,
           uc.partner_user_id as partner_id,
           coalesce(p.timezone, 'UTC') as tz,
           coalesce(p.daily_deadline, time '20:00') as deadline,
           coalesce(p.full_name, 'Your partner') as owner_name,
           uc.started_at,
           uc.ends_at
    from public.user_challenges uc
    join public.profiles p on p.id = uc.user_id
    -- The pairing, not the vestigial mode column. A confirmed partner is the
    -- only person this notification was ever for.
    where uc.partner_state = 'partnered'
      and uc.partner_user_id is not null
      and uc.status = 'active'
  loop
    v_local_now := now() at time zone rec.tz;

    -- Today first, then yesterday -- yesterday matters because a late deadline
    -- defers its notification into this morning.
    foreach d in array array[v_local_now::date, v_local_now::date - 1]
    loop
      -- Outside the challenge's own window: nothing was ever due.
      if rec.started_at is not null
         and d < (rec.started_at at time zone rec.tz)::date then
        continue;
      end if;
      if rec.ends_at is not null
         and d > (rec.ends_at at time zone rec.tz)::date then
        continue;
      end if;

      -- Already nudged for this day.
      if exists (
        select 1 from public.daily_status ds
        where ds.user_challenge_id = rec.challenge_id
          and ds.local_date = d
          and ds.missed_notified_at is not null
      ) then
        continue;
      end if;

      -- They actually did it -- nothing to report.
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

      -- Timestamps, not times: `time '23:00' + interval '3 hours'` wraps to
      -- 02:00 and would fire in the middle of the night.
      v_deadline_ts := d + rec.deadline;
      v_notify_ts := v_deadline_ts + interval '3 hours';
      v_quiet_start := d + time '22:00';

      if v_notify_ts > v_quiet_start then
        if v_deadline_ts < v_quiet_start then
          v_notify_ts := v_quiet_start;
        else
          v_notify_ts := (d + 1) + time '08:00';
        end if;
      end if;

      -- Tense follows the day being REPORTED against today, not the day the
      -- notification was scheduled for. The original compared against
      -- v_notify_ts, which is right for the deferred-late-deadline case and
      -- wrong for every other way the yesterday branch is reached -- including
      -- the one that is about to happen on first run here, where days that were
      -- missed while this function was broken get picked up a day late and
      -- would have been announced as "hasn't checked in yet today".
      v_past_tense := d < v_local_now::date;

      -- Not due yet.
      if v_local_now < v_notify_ts then
        continue;
      end if;

      -- Too stale to be worth a nudge; don't resurrect old misses.
      if v_local_now > v_notify_ts + interval '20 hours' then
        continue;
      end if;

      select late_note into v_note
      from public.daily_status
      where user_challenge_id = rec.challenge_id and local_date = d;

      v_name := split_part(rec.owner_name, ' ', 1);

      -- Motivating, not shaming -- the spec's own wording.
      v_title := v_name || (case when v_past_tense
                                 then ' didn''t check in yesterday'
                                 else ' hasn''t checked in yet today' end);
      v_body := 'Might be worth a nudge.';
      if v_note is not null and length(trim(v_note)) > 0 then
        v_body := 'They said: "' || trim(v_note) || '"';
      end if;

      perform net.http_post(
        url := v_url || '/send-push',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_key
        ),
        body := jsonb_build_object(
          'userId', rec.partner_id,
          'kind', 'partner_activity', -- maps to the accountability_alerts opt-out
          'title', v_title,
          'body', v_body,
          -- Challenges is where the nudge button lives, so land them on the
          -- screen that can act on this rather than on Home.
          'route', '/(tabs)/challenges'
        )
      );

      insert into public.daily_status (user_challenge_id, local_date, missed_notified_at)
      values (rec.challenge_id, d, now())
      on conflict (user_challenge_id, local_date)
      do update set missed_notified_at = now(), updated_at = now();

      v_sent := v_sent + 1;
      -- One nudge per challenge per run; today wins over yesterday.
      exit;
    end loop;
  end loop;

  return v_sent;
end;
$$;

revoke all on function public.sweep_missed_checkins() from public, anon, authenticated;
