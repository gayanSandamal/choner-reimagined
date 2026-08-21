-- The database half of automatic partner matching.
--
-- The scoring itself deliberately stays in features/challenges/matching.ts and
-- is NOT reimplemented here. PARTNER_MATCHING.md is explicit that a second copy
-- of the rules would drift from the tested one, so the partner-match edge
-- function imports that module directly and this file only does the two things
-- SQL is actually better at: handing over a consistent snapshot of the pool,
-- and committing a pairing atomically.
--
-- CONSENT
--
-- Only people who tapped "Find a partner" are ever considered. That is not a
-- filter applied here as an afterthought -- partner_match_requests exists only
-- because join_match_pool() inserted a row when the user asked. Someone who
-- never asked has no row and is invisible to matching, and leave_match_pool()
-- takes them back out.

-- ============================================================
-- get_match_pool -- one consistent snapshot, shaped as Candidate[]
-- ============================================================
--
-- Keys are quoted to survive Postgres lower-casing: they have to arrive as the
-- exact camelCase field names the Candidate interface declares.
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
      -- Already paired, whatever a stale pool row still claims.
      and uc.partner_state in ('finding', 'solo')
  ) c;
$$;

revoke all on function public.get_match_pool() from public, anon, authenticated;

-- ============================================================
-- create_partner_match -- commit one pairing, or refuse
-- ============================================================
--
-- Returns false rather than raising when either side has been taken since the
-- caller read the pool. That is an ordinary race -- the 5-minute cron and
-- somebody running the CLI can easily overlap -- and the caller just moves on
-- to the next pairing.
--
-- The row locks are what make it safe: two callers cannot both see the same
-- person as available.
create or replace function public.create_partner_match(
  p_user_a uuid,
  p_user_b uuid,
  p_template uuid,
  p_blurb_a text,
  p_blurb_b text
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_a_ok boolean;
  v_b_ok boolean;
begin
  if p_user_a = p_user_b then
    return false;
  end if;

  -- Lock both pool rows in a stable order so two concurrent callers pairing
  -- overlapping people cannot deadlock against each other.
  perform 1 from public.partner_match_requests
  where user_id in (p_user_a, p_user_b) and status = 'waiting'
  order by user_id
  for update;

  select exists (
    select 1 from public.partner_match_requests r
    join public.user_challenges uc on uc.id = r.user_challenge_id
    where r.user_id = p_user_a and r.status = 'waiting'
      and uc.status = 'active' and uc.partner_state in ('finding', 'solo')
  ) into v_a_ok;

  select exists (
    select 1 from public.partner_match_requests r
    join public.user_challenges uc on uc.id = r.user_challenge_id
    where r.user_id = p_user_b and r.status = 'waiting'
      and uc.status = 'active' and uc.partner_state in ('finding', 'solo')
  ) into v_b_ok;

  if not v_a_ok or not v_b_ok then
    return false;
  end if;

  insert into public.partner_matches
    (user_a, user_b, challenge_template_id, blurb_about_a, blurb_about_b, status)
  values (p_user_a, p_user_b, p_template, p_blurb_a, p_blurb_b, 'pending');

  update public.partner_match_requests
  set status = 'matched', updated_at = now()
  where user_id in (p_user_a, p_user_b) and status = 'waiting';

  update public.user_challenges
  set partner_state = 'matched'
  where user_id in (p_user_a, p_user_b)
    and status = 'active' and partner_state in ('finding', 'solo');

  return true;
end;
$$;

revoke all on function public.create_partner_match(uuid, uuid, uuid, text, text)
  from public, anon, authenticated;

notify pgrst, 'reload schema';
