-- Phase 7 — the Find form actually collects matching preferences, so
-- join_match_pool has to accept them.
--
-- p_timezone was already plumbed from the client and read by NOTHING (the
-- scorer uses profiles.timezone), which makes this signature the natural
-- extension point rather than a new RPC.
--
-- Mode, location and the conditional extras land on user_challenges rather
-- than the request row: they describe the challenge, and they should survive
-- leaving and rejoining the pool rather than being re-asked every time.

alter table public.user_challenges
  add column if not exists gender_preference text,
  add column if not exists pace text,
  add column if not exists skill_level text,
  add column if not exists court_access text,
  add column if not exists bike_access text,
  add column if not exists gym_access text,
  add column if not exists same_gym boolean,
  add column if not exists time_of_day text,
  add column if not exists specific_days text[];

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'user_challenges_gender_preference_check') then
    alter table public.user_challenges add constraint user_challenges_gender_preference_check
      check (gender_preference is null or gender_preference in ('no_preference', 'same_gender_only'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'user_challenges_pace_check') then
    alter table public.user_challenges add constraint user_challenges_pace_check
      check (pace is null or pace in ('slow', 'moderate', 'fast'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'user_challenges_skill_level_check') then
    alter table public.user_challenges add constraint user_challenges_skill_level_check
      check (skill_level is null or skill_level in ('beginner', 'casual', 'intermediate', 'advanced'));
  end if;
end $$;

create or replace function public.join_match_pool(
  p_user_challenge_id uuid,
  p_timezone text default null,
  p_mode text default null,
  p_preferred_location text default null,
  p_gender_preference text default null,
  p_pace text default null,
  p_skill_level text default null,
  p_court_access text default null,
  p_bike_access text default null,
  p_gym_access text default null,
  p_same_gym boolean default null
) returns uuid
language plpgsql
security definer
set search_path = public, net, extensions
as $$
declare
  v_uid uuid := auth.uid();
  v_owner uuid;
  v_template uuid;
  v_custom text;
  v_commitment numeric;
  v_capability numeric;
  v_beginner numeric;
  v_id uuid;
  v_key text;
  v_url text;
  v_tz text;
  v_today date;
  v_used int;
  v_already_waiting boolean;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select user_id, challenge_template_id, custom_habit_title,
         commitment_value, capability_value, beginner_start_value
    into v_owner, v_template, v_custom, v_commitment, v_capability, v_beginner
  from public.user_challenges where id = p_user_challenge_id;

  if v_owner is null then
    raise exception 'challenge not found';
  end if;
  if v_owner <> v_uid then
    raise exception 'not your challenge';
  end if;
  if v_custom is not null then
    raise exception 'find a partner is not available for a habit you wrote yourself';
  end if;

  -- The spec's gate: matching quality depends on these, so a request can't be
  -- submitted without them. The client routes to the Home prompt instead.
  if v_commitment is null or (v_capability is null and v_beginner is null) then
    raise exception 'starting_point_required'
      using hint = 'Answer where you are starting from before looking for a partner.';
  end if;

  -- Persist the matching preferences onto the challenge. coalesce so a
  -- re-join that omits a field doesn't wipe what was already answered.
  update public.user_challenges
  set mode = coalesce(p_mode, mode),
      preferred_location = coalesce(p_preferred_location, preferred_location),
      gender_preference = coalesce(p_gender_preference, gender_preference),
      pace = coalesce(p_pace, pace),
      skill_level = coalesce(p_skill_level, skill_level),
      court_access = coalesce(p_court_access, court_access),
      bike_access = coalesce(p_bike_access, bike_access),
      gym_access = coalesce(p_gym_access, gym_access),
      same_gym = coalesce(p_same_gym, same_gym)
  where id = p_user_challenge_id;

  select coalesce(timezone, 'UTC') into v_tz from public.profiles where id = v_uid;
  v_today := (now() at time zone coalesce(v_tz, 'UTC'))::date;

  -- Scoped to THIS challenge now. Under the multi-challenge model a user can
  -- legitimately be waiting on another one, and that must not count as
  -- "already waiting" here.
  select exists (
    select 1 from public.partner_match_requests
    where user_id = v_uid and user_challenge_id = p_user_challenge_id and status = 'waiting'
  ) into v_already_waiting;

  if not v_already_waiting then
    select count(*) into v_used
    from public.partner_search_attempts
    where user_id = v_uid and local_date = v_today;

    if v_used >= public.daily_search_limit() then
      raise exception 'daily_search_limit_reached'
        using hint = 'You have used all ' || public.daily_search_limit()
                     || ' partner searches for today.';
    end if;

    insert into public.partner_search_attempts (user_id, local_date)
    values (v_uid, v_today);
  end if;

  -- Close any stale non-waiting row for this challenge first, so the upsert
  -- below can never collide with the partial unique index.
  update public.partner_match_requests
  set status = 'cancelled', updated_at = now()
  where user_id = v_uid and user_challenge_id = p_user_challenge_id and status = 'matched';

  insert into public.partner_match_requests(
    user_id, user_challenge_id, challenge_template_id, timezone)
  values (v_uid, p_user_challenge_id, v_template, p_timezone)
  on conflict (user_id, user_challenge_id) where status = 'waiting'
  do update set challenge_template_id = excluded.challenge_template_id,
                timezone = excluded.timezone,
                no_match_at = null,
                updated_at = now()
  returning id into v_id;

  update public.user_challenges set partner_state = 'finding' where id = p_user_challenge_id;

  begin
    select value into v_key from public.app_config where key = 'service_role_key';
    select value into v_url from public.app_config where key = 'functions_base_url';
    if v_key is not null and v_url is not null then
      perform net.http_post(
        url := v_url || '/partner-match',
        headers := jsonb_build_object('Content-Type','application/json',
                                      'Authorization', 'Bearer ' || v_key),
        body := jsonb_build_object('userId', v_uid::text)
      );
    else raise notice 'join_match_pool: app_config missing, leaving it to the cron';
    end if;
  exception when others then
    raise notice 'join_match_pool: immediate match failed, leaving it to the cron';
  end;

  return v_id;
end;
$$;

grant execute on function public.join_match_pool(
  uuid, text, text, text, text, text, text, text, text, text, boolean) to authenticated;

-- Remove the old 2-arg form so the defaulted one isn't ambiguous against it.
drop function if exists public.join_match_pool(uuid, text);
