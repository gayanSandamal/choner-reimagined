-- Searching no longer needs a starting point (#107).
--
-- join_match_pool() refused a search until the challenge had a commitment and
-- a capability (or a beginner's start), and the app answered that refusal with
-- the "Where are you starting from?" sheet. That gate belonged to the daily
-- model. On the weekly model the pair agrees distance, pace and cadence after
-- they are matched (the Find form itself says so), so asking for them before
-- the search is the old form the issue reports.
--
-- This is the live body of join_match_pool (202609182200) with that one check
-- removed and nothing else changed. The columns stay; they are simply no longer
-- required to search.
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
)
returns uuid
language plpgsql
security definer
set search_path = public, net, extensions
as $$
declare
  v_uid uuid := auth.uid();
  v_owner uuid;
  v_template uuid;
  v_custom text;
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

  select user_id, challenge_template_id, custom_habit_title
    into v_owner, v_template, v_custom
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
