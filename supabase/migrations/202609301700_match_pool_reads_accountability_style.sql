-- SCHEMA task 5, step 3: get_match_pool() reads the tone under its new name.
--
-- The one function that really reads profiles.accountability_mode. The handover
-- listed four (202608211400, 202609182100, 202609231000, 202609231100), but each
-- redefined the last, so only the 202609231100 body was live; this re-issues it
-- with `p.accountability_mode` -> `p.accountability_style` and nothing else.
-- accountability_style is kept in step with the old column by the trigger from
-- 202609291100, so the value returned is unchanged.

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
      coalesce(p.accountability_style, 'encouraging') as style,
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
