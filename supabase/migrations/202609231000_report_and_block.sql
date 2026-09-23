-- Report & Block (Find & Challenges handover §5).
--
-- Two separate actions, never one button. Block is the lightweight exit — "I
-- don't want to interact with this person again", no reason asked. Report is
-- the escalation — a category is required, a row lands in a queue a founder
-- reads, and it ALWAYS blocks as well.
--
-- WHAT THE HANDOVER ASSUMED THAT ISN'T SO
--
-- 1. "previously_unmatched_with on both user records" does not exist as a
--    column. get_match_pool() DERIVES it from partner_matches rows whose status
--    is declined/expired. A confirmed pair that blocks each other has neither
--    status, so without the changes below the matcher would happily pair them
--    again the next time both were in the pool.
--
-- 2. There is no "shared challenge record". Each person owns a user_challenges
--    row; the pairing lives in partner_matches (for matched pairs) or only in
--    partner_user_id (for invited pairs, which never get a match row). So a
--    block has to be remembered somewhere that exists for both: user_blocks.
--
-- THE ONE RULE THAT MATTERS
--
-- The blocked person is never told, by name or by implication, that they were
-- blocked. Who blocked whom lives only in user_blocks, which has RLS on and no
-- policies at all: no client can read it, including the blocker. partner_matches
-- records only that the pairing 'ended' and when — it is readable solely
-- through get_my_match(), which never returns ended rows anyway. The other
-- person gets the same neutral line whether it was a block or a report.
--
-- 'ended' is a status of its own because reusing 'declined' or 'expired' — or
-- setting either challenge to 'abandoned' — would corrupt the completion and
-- retention figures. Both challenges carry on, solo.

-- ============================================================
-- 1. A pairing can end
-- ============================================================

alter table public.partner_matches drop constraint if exists partner_matches_status_check;
alter table public.partner_matches
  add constraint partner_matches_status_check
  check (status in ('pending', 'confirmed', 'declined', 'expired', 'ended'));

alter table public.partner_matches
  add column if not exists ended_at timestamptz;

-- ============================================================
-- 2. Blocks — person-level, and invisible to every client
-- ============================================================

create table if not exists public.user_blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint user_blocks_distinct check (blocker_id <> blocked_id),
  constraint user_blocks_once unique (blocker_id, blocked_id)
);

create index if not exists user_blocks_blocked_idx on public.user_blocks (blocked_id);

-- RLS on, no policies: written only by the functions below, read only by the
-- matcher. There is deliberately no way for a client to ask "who blocked me".
alter table public.user_blocks enable row level security;

-- ============================================================
-- 3. The report queue — a plain table a founder reads directly
-- ============================================================

create table if not exists public.user_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_user_id uuid not null references auth.users(id) on delete cascade,
  reported_user_id uuid not null references auth.users(id) on delete cascade,
  partner_match_id uuid references public.partner_matches(id) on delete set null,
  category text not null check (category in (
    'didnt_show_up',
    'made_me_uncomfortable',
    'inappropriate_behavior',
    'safety_concern',
    'fake_profile',
    'something_else'
  )),
  free_text text check (free_text is null or char_length(free_text) <= 1000),
  -- Whether the pair had met when this was filed. Four of the six categories
  -- describe things that cannot have happened before a meeting, so this is the
  -- context a reviewer needs to read the category at all.
  met boolean not null,
  status text not null default 'open' check (status in ('open', 'reviewed')),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint user_reports_distinct check (reporter_user_id <> reported_user_id)
);

create index if not exists user_reports_queue_idx on public.user_reports (status, created_at);

-- Founders review this in the dashboard with the service role. Nobody reads it
-- from the app, the reporter included.
alter table public.user_reports enable row level security;

-- ============================================================
-- 4. Have these two actually met?
-- ============================================================

-- "Met" is the QR scan completing (Run together) or a first check-in being
-- logged (Run separately, together), whichever comes first. The QR scan does
-- not exist yet, so today this is the check-in half only: any check-in on
-- either challenge since the pairing started. started_at is reset to the
-- confirmation time by confirm_match(), which is what stops a solo check-in
-- from before the pairing counting as a meeting.
create or replace function public.pairing_has_met(p_challenge_a uuid, p_challenge_b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.task_checkins tc
    join public.user_challenges uc on uc.id = tc.user_challenge_id
    where tc.user_challenge_id in (p_challenge_a, p_challenge_b)
      and tc.status = 'completed'
      and tc.completed_at >= uc.started_at
  );
$$;

revoke all on function public.pairing_has_met(uuid, uuid) from public, anon, authenticated;

-- The client asks this to decide which report categories to offer. Scoped to
-- the caller's own partnered challenge, so it can't be used to probe anyone
-- else's pairings. The server re-checks at submission regardless.
create or replace function public.my_pairing_met(p_user_challenge_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_partner uuid;
  v_partner_challenge uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select partner_user_id into v_partner
  from public.user_challenges
  where id = p_user_challenge_id and user_id = v_uid and partner_state = 'partnered';

  if v_partner is null then
    return false;
  end if;

  select id into v_partner_challenge
  from public.user_challenges
  where user_id = v_partner and partner_user_id = v_uid and partner_state = 'partnered'
  order by started_at desc nulls last
  limit 1;

  return public.pairing_has_met(p_user_challenge_id, v_partner_challenge);
end;
$$;

revoke all on function public.my_pairing_met(uuid) from public, anon;
grant execute on function public.my_pairing_met(uuid) to authenticated;

-- ============================================================
-- 5. Ending everything between two people
-- ============================================================

-- Block is person-level, not pairing-level: "I don't want to interact with
-- this person again" covers every challenge they share, not just the one the
-- menu was opened from.
create or replace function public.end_pairings_between(p_me uuid, p_other uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  -- Proposals still waiting on an answer. Each side goes back to the pool,
  -- exactly as decline_match() releases them: the other person did nothing
  -- that should cost them their place in it.
  for r in
    select * from public.partner_matches
    where status = 'pending'
      and ((user_a = p_me and user_b = p_other) or (user_a = p_other and user_b = p_me))
    for update
  loop
    update public.partner_matches
    set status = 'ended', ended_at = now(), updated_at = now()
    where id = r.id;

    update public.partner_match_requests
    set status = 'waiting', no_match_at = null, updated_at = now()
    where user_challenge_id in (r.user_challenge_a, r.user_challenge_b)
      and status = 'matched';

    update public.user_challenges
    set partner_state = 'finding'
    where id in (r.user_challenge_a, r.user_challenge_b)
      and status in ('active', 'pending', 'paused');
  end loop;

  -- Live pairings. The relationship ends; neither challenge does.
  update public.partner_matches
  set status = 'ended', ended_at = now(), updated_at = now()
  where status = 'confirmed'
    and ((user_a = p_me and user_b = p_other) or (user_a = p_other and user_b = p_me));

  -- Back to solo rather than back into the pool: nobody who has just reported
  -- a safety concern should find themselves being matched again without
  -- asking. Clearing partner_user_id is also what revokes every partner-scoped
  -- read — is_partner_of() keys on it — so photos, reflections and the pair
  -- timeline close in the same statement.
  update public.user_challenges
  set partner_state = 'solo', partner_user_id = null
  where partner_state = 'partnered'
    and ((user_id = p_me and partner_user_id = p_other)
      or (user_id = p_other and partner_user_id = p_me));

  insert into public.user_blocks (blocker_id, blocked_id)
  values (p_me, p_other)
  on conflict (blocker_id, blocked_id) do nothing;
end;
$$;

revoke all on function public.end_pairings_between(uuid, uuid) from public, anon, authenticated;

-- The neutral line the other person sees. Identical for a block and a report,
-- and it names nobody. In-app only, no push: the handover allows exactly this
-- copy and nothing more (§5.7), and a push would make the moment louder than
-- it needs to be.
create or replace function public.notify_match_ended(p_user_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.notifications (user_id, kind, title, body, data)
  values (
    p_user_id,
    'match_ended',
    'This match has ended.',
    'Your challenge continues. You can look for a new partner anytime.',
    '{}'::jsonb
  );
$$;

revoke all on function public.notify_match_ended(uuid) from public, anon, authenticated;

-- ============================================================
-- 6. What the app calls
-- ============================================================

-- Takes the caller's own challenge, never a user id: the partner is resolved
-- server-side, the same reason nudge_partner() takes no arguments — a client
-- that could name its target could block or report strangers.
create or replace function public.block_partner(p_user_challenge_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_partner uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select partner_user_id into v_partner
  from public.user_challenges
  where id = p_user_challenge_id and user_id = v_uid and partner_state = 'partnered'
  for update;

  if v_partner is null then
    return jsonb_build_object('ok', false, 'reason', 'no_partner');
  end if;

  perform public.end_pairings_between(v_uid, v_partner);
  perform public.notify_match_ended(v_partner);

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.block_partner(uuid) from public, anon;
grant execute on function public.block_partner(uuid) to authenticated;

-- Report on a live pairing. Always blocks as well.
create or replace function public.report_partner(
  p_user_challenge_id uuid,
  p_category text,
  p_free_text text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_partner uuid;
  v_partner_challenge uuid;
  v_match uuid;
  v_met boolean;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select partner_user_id into v_partner
  from public.user_challenges
  where id = p_user_challenge_id and user_id = v_uid and partner_state = 'partnered'
  for update;

  if v_partner is null then
    return jsonb_build_object('ok', false, 'reason', 'no_partner');
  end if;

  select id into v_partner_challenge
  from public.user_challenges
  where user_id = v_partner and partner_user_id = v_uid and partner_state = 'partnered'
  order by started_at desc nulls last
  limit 1;

  v_met := public.pairing_has_met(p_user_challenge_id, v_partner_challenge);

  -- Re-checked here rather than trusted from the client: before a meeting only
  -- the two categories that can already be true are accepted.
  if not v_met and p_category not in ('fake_profile', 'something_else') then
    return jsonb_build_object('ok', false, 'reason', 'category_unavailable');
  end if;

  -- Invited pairs have no match row, so this is legitimately null for them.
  select id into v_match
  from public.partner_matches
  where status = 'confirmed'
    and ((user_a = v_uid and user_b = v_partner) or (user_a = v_partner and user_b = v_uid))
  order by updated_at desc
  limit 1;

  insert into public.user_reports
    (reporter_user_id, reported_user_id, partner_match_id, category, free_text, met)
  values
    (v_uid, v_partner, v_match, p_category, nullif(btrim(p_free_text), ''), v_met);

  perform public.end_pairings_between(v_uid, v_partner);
  perform public.notify_match_ended(v_partner);

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.report_partner(uuid, text, text) from public, anon;
grant execute on function public.report_partner(uuid, text, text) to authenticated;

-- Report from Match Found, before either side has accepted — so a concerning
-- photo can be flagged the moment it's seen. Nobody has met, so only the two
-- pre-meeting categories exist here. The other person is simply returned to
-- the pool, as with a decline, and is told nothing: from their side a match
-- that never started just isn't there any more.
create or replace function public.report_match(
  p_match_id uuid,
  p_category text,
  p_free_text text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  r record;
  v_other uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select * into r from public.partner_matches
  where id = p_match_id and status = 'pending'
  for update;

  if r.id is null then
    return jsonb_build_object('ok', false, 'reason', 'match_not_found');
  end if;
  if v_uid <> r.user_a and v_uid <> r.user_b then
    raise exception 'not your match';
  end if;

  if p_category not in ('fake_profile', 'something_else') then
    return jsonb_build_object('ok', false, 'reason', 'category_unavailable');
  end if;

  v_other := case when r.user_a = v_uid then r.user_b else r.user_a end;

  insert into public.user_reports
    (reporter_user_id, reported_user_id, partner_match_id, category, free_text, met)
  values
    (v_uid, v_other, r.id, p_category, nullif(btrim(p_free_text), ''), false);

  perform public.end_pairings_between(v_uid, v_other);

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.report_match(uuid, text, text) from public, anon;
grant execute on function public.report_match(uuid, text, text) to authenticated;

-- ============================================================
-- 7. The matcher must never offer them to each other again
-- ============================================================

-- Unchanged from 202609182100_match_pool_v2_contract.sql except
-- "previouslyUnmatchedWith": ended pairings count, and so does a block in
-- EITHER direction. matching.ts already hard-filters on this list from both
-- sides, so nothing in the edge function needs to change.
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

-- And at the one function that writes the row, whatever produced the pair.
-- Unchanged from 202609182100 apart from the block check.
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

  if exists (
    select 1 from public.user_blocks
    where (blocker_id = p_user_a and blocked_id = p_user_b)
       or (blocker_id = p_user_b and blocked_id = p_user_a)
  ) then
    return false;
  end if;

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

notify pgrst, 'reload schema';
