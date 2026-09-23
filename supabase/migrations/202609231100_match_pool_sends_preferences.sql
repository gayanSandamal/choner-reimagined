-- P0: the matcher never saw the preferences people gave it.
--
-- join_match_pool() (202609182200) saves gender_preference, pace, skill level,
-- court/bike/gym access, same-gym, time of day and specific days onto
-- user_challenges. get_match_pool() never selected any of them, and
-- partner-match casts pool rows straight to Candidate — so sameGenderOnly was
-- always undefined and hardBlock()'s "gender preference" rule could never fire.
-- A user who chose "Same gender only" could be matched with anyone.
--
-- Every rule these feed is null-safe (it only fires when BOTH sides answered),
-- so people who were never asked are unaffected.
--
-- Unchanged from 202609231000_report_and_block.sql apart from the new fields.

create or replace function public.get_match_pool()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(to_jsonb(c) order by c."joinedPoolAt"), '[]'::jsonb)
  from (
    select
      r.user_id                                as "userId",
      r.challenge_template_id                  as "challengeTemplateId",
      (uc.custom_habit_title is not null)      as "isCustomHabit",
      t.duration_days                          as "durationDays",
      coalesce(p.accountability_mode, 'encouraging') as style,
      p.timezone                               as timezone,
      p.city                                   as city,
      (extract(epoch from r.created_at) * 1000)::bigint as "joinedPoolAt",
      coalesce(p.full_name, 'Someone')         as "fullName",
      t.title                                  as habit,
      -- v2 fields
      t.activity_key                           as "activityKey",
      uc.mode                                  as mode,
      uc.days_per_week                         as "daysPerWeek",
      uc.capability_value                      as "capabilityValue",
      uc.commitment_value                      as "commitmentValue",
      p.age_range                              as "ageBand",
      p.gender                                 as gender,
      -- Saved by join_match_pool() since 202609182200 but never sent to the
      -- matcher until now, so every rule below was silently inert — including
      -- "Same gender only", which users were told is absolute.
      (uc.gender_preference = 'same_gender_only') as "sameGenderOnly",
      uc.pace                                  as pace,
      uc.skill_level                           as "skillLevel",
      uc.court_access                          as "courtAccess",
      uc.bike_access                           as "bikeAccess",
      uc.gym_access                            as "gymAccess",
      uc.same_gym                              as "sameGym",
      uc.time_of_day                           as "timeOfDay",
      coalesce(to_jsonb(uc.specific_days), '[]'::jsonb) as "specificDays",
      -- Corridor tags for wherever they're willing to meet. Empty when they
      -- haven't set a location, which blocks in-person pairs at the hard
      -- filter rather than silently scoring them zero.
      coalesce((
        select jsonb_agg(lt.tag)
        from public.location_tags lt
        where lt.location_value = uc.preferred_location
      ), '[]'::jsonb)                          as "locationTags",
      coalesce((
        select jsonb_agg(jsonb_build_object(
          'question_key', cr.question_key,
          'choice_key',   cr.choice_key,
          'custom_text',  cr.custom_text))
        from public.challenge_reflections cr where cr.user_id = r.user_id
      ), '[]'::jsonb)                          as reflections,
      coalesce((
        select jsonb_agg(x.other_id)
        from (
          select case when pm.user_a = r.user_id then pm.user_b else pm.user_a end as other_id
          from public.partner_matches pm
          where (pm.user_a = r.user_id or pm.user_b = r.user_id)
            and pm.status in ('declined', 'expired', 'ended')
          union
          select ub.blocked_id from public.user_blocks ub where ub.blocker_id = r.user_id
          union
          select ub.blocker_id from public.user_blocks ub where ub.blocked_id = r.user_id
        ) x
      ), '[]'::jsonb)                          as "previouslyUnmatchedWith"
    from public.partner_match_requests r
    join public.user_challenges uc     on uc.id = r.user_challenge_id
    join public.challenge_templates t  on t.id  = r.challenge_template_id
    join public.profiles p             on p.id  = r.user_id
    where r.status = 'waiting'
      and uc.status = 'active'
      and uc.partner_state in ('finding', 'solo')
  ) c;
$$;

revoke all on function public.get_match_pool() from public, anon, authenticated;

-- ============================================================
-- record_match_search, scoped to the request that was searched
-- ============================================================
-- It stamped "we looked and found nobody" on EVERY waiting request the user
-- held. Under multi-challenge, finding a running partner could mark their gym
-- request as a dead end it had never been searched for. A null template keeps
-- the old whole-user behaviour for any caller that doesn't pass one.
drop function if exists public.record_match_search(uuid, boolean);

create or replace function public.record_match_search(
  p_user_id uuid,
  p_found boolean,
  p_template uuid default null
)
returns void
language sql
security definer
set search_path = public
as $$
  update public.partner_match_requests
  set last_searched_at = now(),
      no_match_at = case when p_found then null else now() end,
      updated_at = now()
  where user_id = p_user_id
    and status = 'waiting'
    and (p_template is null or challenge_template_id = p_template);
$$;

revoke all on function public.record_match_search(uuid, boolean, uuid) from public, anon, authenticated;

notify pgrst, 'reload schema';
