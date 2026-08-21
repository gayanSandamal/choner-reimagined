-- Everything in this file is one bug wearing three hats: "today" is computed in
-- UTC in the places the client reads, and in the user's own timezone in the
-- places the cron sweeps read. Those two answers disagree for five and a half
-- hours a day in Asia/Colombo, which is where most of the current users are.
--
-- Concretely: someone who logs at 1am local has a completed_at whose UTC date is
-- YESTERDAY. get_partner_status therefore reports checked_in_today = false for a
-- habit that is demonstrably done, which would put a "Nudge them" button in
-- front of their partner and let it fire at somebody who already logged. The
-- sweeps, reading local dates, would correctly stay quiet -- so the two halves
-- of the feature would contradict each other nightly.
--
-- Fixing it in one place is not enough; the UTC assumption is load-bearing in
-- both of the functions below, so both move to the owner's timezone together.
--
-- Also here, because the Challenges tab needs it to render the nudge button in
-- its "already nudged" state: nudged_today on get_partner_status. It is the one
-- call that screen already makes, and it is the only place with the timezone
-- context to answer the question correctly.

-- ============================================================
-- get_partner_status -- local dates, nudge state, and an authorisation check
-- ============================================================
--
-- The authorisation check is new and is a fix in its own right. This is a
-- security-definer function taking a user id as an argument, granted to
-- authenticated, that never verified the caller was asking about themselves --
-- so any signed-in user could read any other user's partner, name, avatar and
-- daily progress by passing their id. Nothing in the app does that, but the
-- shape is a straightforward IDOR and it costs two lines to close.
--
-- auth.uid() is null under the service role, which is how the sweeps and edge
-- functions call this, so the guard has to permit that case explicitly rather
-- than simply comparing the two.
create or replace function public.get_partner_status(p_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_partner_id uuid;
  v_state text;
  v_name text;
  v_avatar text;
  v_challenge_id uuid;
  v_partner_tz text;
  v_partner_today date;
  v_my_tz text;
  v_my_today date;
  v_nudged boolean := false;
  v_total int := 0;
  v_done int := 0;
begin
  if auth.uid() is not null and auth.uid() <> p_user_id then
    raise exception 'not your status';
  end if;

  select partner_user_id, partner_state into v_partner_id, v_state
  from public.user_challenges
  where user_id = p_user_id and status in ('active', 'pending', 'paused')
  order by started_at desc
  limit 1;

  if v_partner_id is null or v_state <> 'partnered' then
    return jsonb_build_object('linked', false, 'partner_state', coalesce(v_state, 'solo'));
  end if;

  select full_name, avatar_url into v_name, v_avatar
  from public.profiles where id = v_partner_id;

  select coalesce(timezone, 'UTC') into v_partner_tz
  from public.profiles where id = v_partner_id;
  select coalesce(timezone, 'UTC') into v_my_tz
  from public.profiles where id = p_user_id;

  -- Their day for their progress, my day for my rate limit. These are genuinely
  -- different questions and can fall on different dates.
  v_partner_today := (now() at time zone coalesce(v_partner_tz, 'UTC'))::date;
  v_my_today := (now() at time zone coalesce(v_my_tz, 'UTC'))::date;

  select id into v_challenge_id
  from public.user_challenges
  where user_id = v_partner_id and status in ('active', 'paused')
  order by started_at desc
  limit 1;

  if v_challenge_id is not null then
    select count(*) into v_total
    from public.challenge_tasks where user_challenge_id = v_challenge_id;

    select count(distinct ct.id) into v_done
    from public.challenge_tasks ct
    join public.task_checkins tc on tc.challenge_task_id = ct.id
    where ct.user_challenge_id = v_challenge_id
      and tc.status = 'completed'
      and (tc.completed_at at time zone coalesce(v_partner_tz, 'UTC'))::date = v_partner_today;
  end if;

  select exists (
    select 1 from public.partner_nudges
    where from_user_id = p_user_id
      and to_user_id = v_partner_id
      and local_date = v_my_today
  ) into v_nudged;

  return jsonb_build_object(
    'linked', true,
    'partner_state', v_state,
    'partner_id', v_partner_id,
    'name', v_name,
    'avatar_url', v_avatar,
    'total_tasks', v_total,
    'completed_today', v_done,
    'checked_in_today', v_done > 0,
    'nudged_today', v_nudged
  );
end;
$$;

-- ============================================================
-- notify_partner_on_checkin -- same UTC assumption, same fix
-- ============================================================
--
-- Two date comparisons here were UTC-based. The first is the "one notification
-- per day per challenge" guard: at UTC+5:30 a log just after local midnight
-- lands on the previous UTC date, so the guard fails to see the earlier
-- check-in and sends a second push for what the user experiences as one day.
-- The second is whether the partner has already logged, which decides between
-- celebratory and nudging copy -- getting it wrong tells someone their partner
-- hasn't logged when they have.
create or replace function public.notify_partner_on_checkin()
returns trigger
language plpgsql
security definer
set search_path = public, net, extensions
as $$
declare
  v_owner uuid;
  v_partner uuid;
  v_owner_name text;
  v_habit text;
  v_owner_tz text;
  v_partner_tz text;
  v_owner_today date;
  v_partner_today date;
  v_partner_challenge uuid;
  v_partner_done boolean := false;
  v_key text;
  v_url text;
  v_title text;
  v_body text;
begin
  select uc.user_id, uc.partner_user_id,
         coalesce(uc.custom_habit_title, ct.title, 'today''s habit')
    into v_owner, v_partner, v_habit
  from public.user_challenges uc
  left join public.challenge_templates ct on ct.id = uc.challenge_template_id
  where uc.id = new.user_challenge_id;

  -- Solo, or a pairing that has not been confirmed: nobody to tell.
  if v_partner is null then
    return new;
  end if;

  select coalesce(timezone, 'UTC') into v_owner_tz from public.profiles where id = v_owner;
  select coalesce(timezone, 'UTC') into v_partner_tz from public.profiles where id = v_partner;
  v_owner_today := (now() at time zone coalesce(v_owner_tz, 'UTC'))::date;
  v_partner_today := (now() at time zone coalesce(v_partner_tz, 'UTC'))::date;

  -- One notification per day per challenge, measured in the logger's own day. A
  -- challenge carries a single task today, but that is a product decision
  -- rather than a guarantee, and nobody wants three pushes for one morning.
  if exists (
    select 1 from public.task_checkins tc
    where tc.user_challenge_id = new.user_challenge_id
      and tc.id <> new.id
      and tc.status = 'completed'
      and (tc.completed_at at time zone coalesce(v_owner_tz, 'UTC'))::date = v_owner_today
  ) then
    return new;
  end if;

  select coalesce(full_name, 'Your partner') into v_owner_name
  from public.profiles where id = v_owner;

  -- Has the partner already logged, in THEIR day? If so this completes the day,
  -- and the copy should celebrate rather than nudge.
  select id into v_partner_challenge
  from public.user_challenges
  where user_id = v_partner and status in ('active', 'paused')
  order by started_at desc
  limit 1;

  if v_partner_challenge is not null then
    select exists (
      select 1
      from public.challenge_tasks ct
      join public.task_checkins tc on tc.challenge_task_id = ct.id
      where ct.user_challenge_id = v_partner_challenge
        and tc.status = 'completed'
        and (tc.completed_at at time zone coalesce(v_partner_tz, 'UTC'))::date = v_partner_today
    ) into v_partner_done;
  end if;

  if v_partner_done then
    v_title := 'You''re both in today';
    v_body := v_habit || ' — streak alive.';
  else
    v_title := split_part(v_owner_name, ' ', 1) || ' just logged today';
    v_body := v_habit || ' — your turn.';
  end if;

  -- Never fatal. A check-in must not roll back because a notification failed;
  -- the partner's app still catches up on its next poll or focus refetch.
  begin
    select value into v_key from public.app_config where key = 'service_role_key';
    select value into v_url from public.app_config where key = 'functions_base_url';

    if v_key is not null and v_url is not null then
      perform net.http_post(
        url := v_url || '/send-push',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_key
        ),
        body := jsonb_build_object(
          'userId', v_partner,
          'kind', 'partner_activity',
          'title', v_title,
          'body', v_body,
          'route', '/(tabs)/challenges'
        )
      );
    else
      raise notice 'notify_partner_on_checkin: app_config missing, nothing sent';
    end if;
  exception when others then
    raise notice 'notify_partner_on_checkin: notification failed, check-in kept';
  end;

  return new;
end;
$$;

-- ============================================================
-- get_today_status -- the client was asking for the wrong day too
-- ============================================================
--
-- getTodayStatus() in the client built its date with
-- `new Date().toISOString().slice(0,10)`, which is UTC, and queried
-- daily_status.local_date -- a column set_late_note writes in the user's own
-- timezone. So after local midnight the "Running late today?" note the user had
-- just written would vanish from their own screen. An RPC removes the client's
-- ability to get the date wrong at all.
create or replace function public.get_today_status(p_user_challenge_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_tz text;
  v_local_date date;
  v_row record;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  if not exists (
    select 1 from public.user_challenges
    where id = p_user_challenge_id and user_id = v_uid
  ) then
    raise exception 'not your challenge';
  end if;

  select coalesce(timezone, 'UTC') into v_tz from public.profiles where id = v_uid;
  v_local_date := (now() at time zone coalesce(v_tz, 'UTC'))::date;

  select local_date, late_note, missed_notified_at, reminded_at into v_row
  from public.daily_status
  where user_challenge_id = p_user_challenge_id and local_date = v_local_date;

  if v_row.local_date is null then
    return null;
  end if;

  return jsonb_build_object(
    'local_date', v_row.local_date,
    'late_note', v_row.late_note,
    'missed_notified_at', v_row.missed_notified_at,
    'reminded_at', v_row.reminded_at
  );
end;
$$;

grant execute on function public.get_today_status(uuid) to authenticated;

notify pgrst, 'reload schema';
