-- The nudge the app has been telling people to send since July.
--
-- The missed-day push has always ended with "Might be worth a nudge." and there
-- has never been anywhere in the app to send one. This adds the action behind
-- the copy.
--
-- WHY AN RPC AND NOT A CLIENT INSERT
--
-- notifications carries SELECT/UPDATE/DELETE policies scoped to
-- user_id = auth.uid() and deliberately no INSERT policy -- RLS with no policy
-- denies -- so a client cannot write a row addressed to somebody else, which is
-- exactly the property we want to keep. Delivery also has to go through
-- send-push to respect the recipient's preferences and reach their devices.
-- Both of those need privileges the caller must not have, so this is a
-- security-definer function with the guards written out explicitly.
--
-- WHY IT RETURNS jsonb INSTEAD OF RAISING
--
-- Four of the five refusals are ordinary, expected states -- the partner
-- already logged, you already nudged, it's the middle of their night -- and the
-- UI needs to say something specific about each. Raising would turn every one
-- of them into an indistinguishable red error.

create table if not exists public.partner_nudges (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references auth.users(id) on delete cascade,
  to_user_id uuid not null references auth.users(id) on delete cascade,
  -- The SENDER's local day. The rate limit is about how often one person may
  -- prod another, so it is measured in the prodder's day.
  local_date date not null,
  created_at timestamptz not null default now(),
  constraint partner_nudges_one_per_day unique (from_user_id, to_user_id, local_date)
);

alter table public.partner_nudges enable row level security;

-- Readable by either side of the exchange -- neither learns anything they were
-- not already told. No INSERT policy: nudge_partner() is the only writer, which
-- is what keeps the once-a-day limit from being bypassable.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'partner_nudges' and policyname = 'partner_nudges_participant_select'
  ) then
    create policy partner_nudges_participant_select on public.partner_nudges
      for select to authenticated
      using (from_user_id = auth.uid() or to_user_id = auth.uid());
  end if;
end $$;

grant select on public.partner_nudges to authenticated;

create or replace function public.nudge_partner()
returns jsonb
language plpgsql
security definer
set search_path = public, net, extensions
as $$
declare
  v_uid uuid := auth.uid();
  v_partner uuid;
  v_my_tz text;
  v_partner_tz text;
  v_my_date date;
  v_partner_local timestamp;
  v_partner_challenge uuid;
  v_habit text;
  v_my_name text;
  v_key text;
  v_url text;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select uc.partner_user_id into v_partner
  from public.user_challenges uc
  where uc.user_id = v_uid
    and uc.status = 'active'
    and uc.partner_state = 'partnered'
    and uc.partner_user_id is not null
  order by uc.started_at desc
  limit 1;

  if v_partner is null then
    return jsonb_build_object('sent', false, 'reason', 'no_partner');
  end if;

  -- Read config before anything is written. Inserting first would burn the
  -- day's one nudge on a delivery that was never going to leave the database.
  select value into v_key from public.app_config where key = 'service_role_key';
  select value into v_url from public.app_config where key = 'functions_base_url';

  if v_key is null or v_url is null then
    raise notice 'nudge_partner: app_config missing, nothing sent';
    return jsonb_build_object('sent', false, 'reason', 'not_configured');
  end if;

  select coalesce(timezone, 'UTC') into v_my_tz from public.profiles where id = v_uid;
  select coalesce(timezone, 'UTC') into v_partner_tz from public.profiles where id = v_partner;

  v_my_date := (now() at time zone coalesce(v_my_tz, 'UTC'))::date;
  v_partner_local := now() at time zone coalesce(v_partner_tz, 'UTC');

  select uc.id, coalesce(uc.custom_habit_title, ct.title, 'today''s habit')
    into v_partner_challenge, v_habit
  from public.user_challenges uc
  left join public.challenge_templates ct on ct.id = uc.challenge_template_id
  where uc.user_id = v_partner and uc.status in ('active', 'paused')
  order by uc.started_at desc
  limit 1;

  -- Already logged: there is nothing to nudge about. Guarded here and not only
  -- in the UI, because a client holding a stale partner status would otherwise
  -- fire a nudge that lands as an accusation at someone who already did it.
  if v_partner_challenge is not null and exists (
    select 1
    from public.challenge_tasks ct2
    join public.task_checkins tc on tc.challenge_task_id = ct2.id
    where ct2.user_challenge_id = v_partner_challenge
      and tc.status = 'completed'
      and (tc.completed_at at time zone coalesce(v_partner_tz, 'UTC'))::date
          = v_partner_local::date
  ) then
    return jsonb_build_object('sent', false, 'reason', 'already_logged');
  end if;

  -- The automated sweep refuses to fire between 22:00 and 08:00 local. A
  -- human-initiated nudge gets the same courtesy: intent doesn't make a 3am
  -- push welcome, and the recipient can do nothing about it until morning.
  if v_partner_local::time >= time '22:00' or v_partner_local::time < time '08:00' then
    return jsonb_build_object('sent', false, 'reason', 'quiet_hours');
  end if;

  -- The insert IS the rate limit. Checking first and inserting after would race
  -- two taps against each other; letting the unique constraint arbitrate cannot.
  begin
    insert into public.partner_nudges (from_user_id, to_user_id, local_date)
    values (v_uid, v_partner, v_my_date);
  exception when unique_violation then
    return jsonb_build_object('sent', false, 'reason', 'already_nudged');
  end;

  select coalesce(full_name, 'Your partner') into v_my_name
  from public.profiles where id = v_uid;

  perform net.http_post(
    url := v_url || '/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_key
    ),
    body := jsonb_build_object(
      'userId', v_partner,
      'kind', 'partner_nudge',
      'title', split_part(v_my_name, ' ', 1) || ' nudged you',
      'body', v_habit || ' is still open today.',
      'route', '/(tabs)/challenges'
    )
  );

  return jsonb_build_object('sent', true);
end;
$$;

revoke all on function public.nudge_partner() from public, anon;
grant execute on function public.nudge_partner() to authenticated;

notify pgrst, 'reload schema';
