-- Up to TWO areas, which is what was agreed and never built (#140).
--
-- The decision is old: 28 September, "maximum 2 locations, closable chips with
-- an x", confirmed twice in DECISIONS_LOG. Both confirmations were about the
-- PROTOTYPES, though, and the React Native app shipped one area with a comment
-- saying why: "One area, because the match pool keeps one preferred location
-- per challenge." That comment was correct. The column was singular, so the
-- form could not have stored a second even if it offered one.
--
-- WHY A SECOND COLUMN AND NOT AN ARRAY. The product rule is exactly two, not
-- "many". A second column says that in the schema itself and needs no length
-- check, no data migration, and no change to any reader that only cares about
-- the first. An array would have been tidier in the abstract and more work in
-- every direction that matters.
--
-- WHAT THIS DOES NOT TOUCH: features/challenges/matching.ts. The scorer
-- already consumes locationTags as an ARRAY and scores by overlap, so two
-- areas simply feed it more tags. The data model was always shaped for a set
-- of tags; only the input was narrowed to one.

alter table public.user_challenges
  add column if not exists preferred_location_2 text references public.locations(value);

comment on column public.user_challenges.preferred_location_2 is
  'Optional second area (#140). Null means they named one. The pair '
  '(preferred_location, preferred_location_2) is the whole set: the product '
  'rule is a maximum of two, enforced by there being two columns.';

-- A second area must be a DIFFERENT area. Picking Kollupitiya twice is not a
-- wider search, it is a mistake, and the form should not be the only thing
-- stopping it.
alter table public.user_challenges
  drop constraint if exists user_challenges_two_distinct_locations;
alter table public.user_challenges
  add constraint user_challenges_two_distinct_locations
  check (preferred_location_2 is null or preferred_location_2 <> preferred_location);

-- A second area with no first is not a half-filled form, it is a bug. Keep the
-- pair ordered so every reader can treat preferred_location as "the one they
-- definitely named".
alter table public.user_challenges
  drop constraint if exists user_challenges_second_location_needs_first;
alter table public.user_challenges
  add constraint user_challenges_second_location_needs_first
  check (preferred_location_2 is null or preferred_location is not null);

-- ---------------------------------------------------------------------------
-- get_match_pool: corridor tags from BOTH areas
-- ---------------------------------------------------------------------------
-- The only change to the live body (202609301700) is the subquery below:
--   where lt.location_value = uc.preferred_location
-- becomes an IN over both. A null second area never matches, so a person who
-- named one area behaves exactly as before.
create or replace function public.get_match_pool(p_template uuid)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(row_to_json(c)), '[]'::jsonb)
  from (
    select
      r.user_id                                as "userId",
      r.user_challenge_id                      as "userChallengeId",
      uc.challenge_template_id                 as "templateId",
      p.full_name                              as "fullName",
      p.age_range                              as "ageRange",
      p.gender                                 as gender,
      p.accountability_style                   as "accountabilityStyle",
      r.timezone                               as timezone,
      extract(epoch from r.created_at) * 1000  as "joinedPoolAt",
      uc.days_per_week                         as "daysPerWeek",
      uc.capability_value                      as "capabilityValue",
      uc.commitment_value                      as "commitmentValue",
      uc.mode                                  as mode,
      uc.gender_preference                     as "genderPreference",
      uc.pace                                  as pace,
      uc.skill_level                           as "skillLevel",
      uc.court_access                          as "courtAccess",
      uc.bike_access                           as "bikeAccess",
      uc.gym_access                            as "gymAccess",
      uc.same_gym                              as "sameGym",
      uc.time_of_day                           as "timeOfDay",
      coalesce(to_jsonb(uc.specific_days), '[]'::jsonb) as "specificDays",
      -- Corridor tags for wherever they're willing to meet, now BOTH areas
      -- (#140). distinct because two neighbouring areas share corridors, and
      -- a tag counted twice would quietly inflate the overlap score.
      coalesce((
        select jsonb_agg(distinct lt.tag)
        from public.location_tags lt
        where lt.location_value in (uc.preferred_location, uc.preferred_location_2)
      ), '[]'::jsonb)                          as "locationTags",
      coalesce((
        select jsonb_agg(jsonb_build_object(
          'question_key', cr.question_key,
          'choice_key',   cr.choice_key,
          'custom_text',  cr.custom_text))
        from public.challenge_reflections cr where cr.user_id = r.user_id
      ), '[]'::jsonb)                          as reflections,
      coalesce((
        select jsonb_agg(distinct pm.user_a) || jsonb_agg(distinct pm.user_b)
        from public.partner_matches pm
        where (pm.user_a = r.user_id or pm.user_b = r.user_id)
          and pm.status in ('declined', 'expired')
      ), '[]'::jsonb)                          as "pastPartners"
    from public.partner_match_requests r
    join public.user_challenges uc on uc.id = r.user_challenge_id
    join public.profiles p on p.id = r.user_id
    where r.status = 'waiting'
      and uc.status = 'active'
      and uc.partner_state in ('finding', 'solo')
      and uc.challenge_template_id = p_template
  ) c;
$$;

-- ---------------------------------------------------------------------------
-- join_match_pool: accepts the second area
-- ---------------------------------------------------------------------------
-- The live body (202610031000) with one parameter added and one line in the
-- UPDATE. Everything else is unchanged, including the daily search limit, the
-- stale-row close and the immediate partner-match kick.
--
-- p_clear_location_2 exists because coalesce cannot distinguish "leave it
-- alone" from "remove it". Without it, nobody could ever go back to one area.
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
  p_same_gym boolean default null,
  p_preferred_location_2 text default null,
  p_clear_location_2 boolean default false
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
      preferred_location_2 = case
        when p_clear_location_2 then null
        else coalesce(p_preferred_location_2, preferred_location_2)
      end,
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
