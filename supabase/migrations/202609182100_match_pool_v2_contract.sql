-- Phase 6 — widen get_match_pool() to the v2 Candidate contract.
--
-- This function IS the contract: matching.ts consumes these camelCase aliases
-- directly, and there is no runtime validation on the boundary (the edge
-- function casts through `as any`). A rename here fails silently — a missing
-- durationDays becomes `undefined !== undefined`, which is false, so the hard
-- filter simply stops filtering. Keep the quoted aliases exactly in step with
-- the Candidate interface.
--
-- Also: match scores are now persisted. create_partner_match previously took
-- no score/signals/reasons, so every MatchScore was discarded the moment the
-- pair was announced — and that outcome data is the entire training set for
-- anything smarter than rules later.

alter table public.partner_matches
  add column if not exists score numeric,
  add column if not exists signal_a int,
  add column if not exists signal_b int,
  add column if not exists reasons jsonb;

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
        select jsonb_agg(case when pm.user_a = r.user_id then pm.user_b else pm.user_a end)
        from public.partner_matches pm
        where (pm.user_a = r.user_id or pm.user_b = r.user_id)
          and pm.status in ('declined', 'expired')
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

-- create_partner_match now records WHY the pair was made.
create or replace function public.create_partner_match(
  p_user_a uuid, p_user_b uuid, p_template uuid,
  p_blurb_a text, p_blurb_b text, p_requested_by uuid default null,
  p_score numeric default null, p_signal_a int default null,
  p_signal_b int default null, p_reasons jsonb default null
) returns boolean
language plpgsql security definer set search_path = public
as $$
declare
  v_challenge_a uuid; v_challenge_b uuid;
begin
  if p_user_a = p_user_b then return false; end if;

  perform 1 from public.partner_match_requests
  where user_id in (p_user_a, p_user_b) and status = 'waiting'
  order by user_id
  for update;

  select r.user_challenge_id into v_challenge_a
  from public.partner_match_requests r
  join public.user_challenges uc on uc.id = r.user_challenge_id
  where r.user_id = p_user_a and r.status = 'waiting'
    and r.challenge_template_id = p_template
    and uc.status = 'active' and uc.partner_state in ('finding', 'solo')
  order by r.created_at limit 1;

  select r.user_challenge_id into v_challenge_b
  from public.partner_match_requests r
  join public.user_challenges uc on uc.id = r.user_challenge_id
  where r.user_id = p_user_b and r.status = 'waiting'
    and r.challenge_template_id = p_template
    and uc.status = 'active' and uc.partner_state in ('finding', 'solo')
  order by r.created_at limit 1;

  if v_challenge_a is null or v_challenge_b is null then return false; end if;

  insert into public.partner_matches
    (user_a, user_b, challenge_template_id, blurb_about_a, blurb_about_b,
     status, requested_by, user_challenge_a, user_challenge_b,
     score, signal_a, signal_b, reasons)
  values (p_user_a, p_user_b, p_template, p_blurb_a, p_blurb_b, 'pending', p_requested_by,
          v_challenge_a, v_challenge_b,
          p_score, p_signal_a, p_signal_b, p_reasons);

  update public.partner_match_requests
  set status = 'matched', no_match_at = null, updated_at = now()
  where user_challenge_id in (v_challenge_a, v_challenge_b) and status = 'waiting';

  update public.user_challenges
  set partner_state = 'matched'
  where id in (v_challenge_a, v_challenge_b);

  return true;
end; $$;

-- Drop the 6-arg form so the defaulted 10-arg one isn't ambiguous against it.
drop function if exists public.create_partner_match(uuid, uuid, uuid, text, text, uuid);
