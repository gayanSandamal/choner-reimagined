-- Phase 5 — retire the single-challenge assumption.
--
-- 202608131600_partner_path_single_challenge.sql collapsed the two-track model
-- into exactly one live challenge per user. The Find spec needs the opposite:
-- Find works per-challenge, so someone running with Amara can separately look
-- for a gym partner.
--
-- Three things block that today, and all three are fixed here.
--
--   1. partner_match_requests_one_waiting is `unique (user_id) where status =
--      'waiting'`. One index, one waiting row, so two concurrent searches are
--      impossible by construction. It becomes (user_id, user_challenge_id).
--
--   2. confirm_match() resolves the challenge with ensure_user_challenge(),
--      which returns ANY existing active challenge. With two open it can
--      attach a partner to the wrong one — a correctness bug, not just a
--      limitation. The match now carries the two challenge ids explicitly.
--
--   3. confirm_match() never moved request rows off 'matched', so they
--      accumulated forever. That is the root cause the 202609120900 migration
--      had to work around, and it becomes more likely once a user can hold
--      several requests. Closed out properly here.

-- ============================================================
-- 1. The match remembers which challenge each side is pairing on
-- ============================================================
alter table public.partner_matches
  add column if not exists user_challenge_a uuid references public.user_challenges(id) on delete set null,
  add column if not exists user_challenge_b uuid references public.user_challenges(id) on delete set null;

-- Backfill from the still-open requests so in-flight matches survive.
update public.partner_matches pm
set user_challenge_a = coalesce(pm.user_challenge_a, (
      select r.user_challenge_id from public.partner_match_requests r
      where r.user_id = pm.user_a and r.challenge_template_id = pm.challenge_template_id
      order by r.updated_at desc limit 1)),
    user_challenge_b = coalesce(pm.user_challenge_b, (
      select r.user_challenge_id from public.partner_match_requests r
      where r.user_id = pm.user_b and r.challenge_template_id = pm.challenge_template_id
      order by r.updated_at desc limit 1))
where pm.status = 'pending';

-- ============================================================
-- 2. Rescope the one-waiting index to (user, challenge)
-- ============================================================
drop index if exists public.partner_match_requests_one_waiting;

create unique index if not exists partner_match_requests_one_waiting
  on public.partner_match_requests (user_id, user_challenge_id) where status = 'waiting';

-- ============================================================
-- 3. ensure_user_challenge gains an explicit "make another" path
--
-- The default stays idempotent — every existing caller relies on getting the
-- current challenge back rather than a second one. p_force_new is opt-in, for
-- the Find-another-partner flow that genuinely wants a new challenge.
-- ============================================================
create or replace function public.ensure_user_challenge(
  p_user_id uuid,
  p_template_id uuid default null,
  p_custom_habit_title text default null,
  p_force_new boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing uuid;
  v_template uuid;
  v_custom text := nullif(btrim(coalesce(p_custom_habit_title, '')), '');
  v_id uuid;
  v_title text;
begin
  if not p_force_new then
    select id into v_existing from public.user_challenges
    where user_id = p_user_id and status in ('active', 'pending', 'paused')
    order by started_at desc limit 1;
    if v_existing is not null then return v_existing; end if;
  end if;

  select coalesce(p_template_id,
    (select id from public.challenge_templates where is_active order by sort_order, created_at limit 1))
  into v_template;
  if v_template is null then return null; end if;

  insert into public.user_challenges(
    user_id, challenge_template_id, accountability_mode, status, ends_at,
    custom_habit_title, partner_state)
  values (
    p_user_id, v_template, 'solo', 'active', now() + interval '7 days',
    v_custom, 'solo')
  returning id into v_id;

  select title into v_title from public.challenge_templates where id = v_template;
  insert into public.challenge_tasks(user_challenge_id, title, sort_order, due_window)
  values (v_id, coalesce(v_custom, v_title, 'Complete today''s habit'), 1, 'anytime');
  return v_id;
end;
$$;

grant execute on function public.ensure_user_challenge(uuid, uuid, text, boolean) to authenticated;

-- ============================================================
-- 4. create_partner_match carries the challenge ids through
-- ============================================================
create or replace function public.create_partner_match(
  p_user_a uuid, p_user_b uuid, p_template uuid,
  p_blurb_a text, p_blurb_b text, p_requested_by uuid default null
) returns boolean
language plpgsql security definer set search_path = public
as $$
declare
  v_a_ok boolean; v_b_ok boolean;
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

  v_a_ok := v_challenge_a is not null;
  v_b_ok := v_challenge_b is not null;
  if not v_a_ok or not v_b_ok then return false; end if;

  insert into public.partner_matches
    (user_a, user_b, challenge_template_id, blurb_about_a, blurb_about_b,
     status, requested_by, user_challenge_a, user_challenge_b)
  values (p_user_a, p_user_b, p_template, p_blurb_a, p_blurb_b, 'pending', p_requested_by,
          v_challenge_a, v_challenge_b);

  -- Scoped to the two specific requests now, not every waiting row the users
  -- happen to hold.
  update public.partner_match_requests
  set status = 'matched', no_match_at = null, updated_at = now()
  where user_challenge_id in (v_challenge_a, v_challenge_b) and status = 'waiting';

  update public.user_challenges
  set partner_state = 'matched'
  where id in (v_challenge_a, v_challenge_b);

  return true;
end; $$;

-- ============================================================
-- 5. confirm_match — the right challenge, and close the requests out
-- ============================================================
create or replace function public.confirm_match(p_match_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  r record;
  v_both boolean;
  v_a_challenge uuid;
  v_b_challenge uuid;
  v_days int;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select * into r from public.partner_matches
  where id = p_match_id and status = 'pending'
  for update;

  if r.id is null then
    raise exception 'match not found or already settled';
  end if;
  if v_uid <> r.user_a and v_uid <> r.user_b then
    raise exception 'not your match';
  end if;

  if v_uid = r.user_a then
    update public.partner_matches set a_confirmed = true, updated_at = now() where id = r.id;
    v_both := r.b_confirmed;
  else
    update public.partner_matches set b_confirmed = true, updated_at = now() where id = r.id;
    v_both := r.a_confirmed;
  end if;

  if not v_both then
    return jsonb_build_object('confirmed', true, 'both', false);
  end if;

  update public.partner_matches
  set status = 'confirmed', updated_at = now() where id = r.id;

  -- Use the challenges the match was actually made on. Falling back to
  -- ensure_user_challenge only covers pre-migration rows that never carried
  -- them; for anything new the ids are always present, so a second concurrent
  -- challenge can no longer be paired by accident.
  v_a_challenge := coalesce(r.user_challenge_a,
                            public.ensure_user_challenge(r.user_a, r.challenge_template_id));
  v_b_challenge := coalesce(r.user_challenge_b,
                            public.ensure_user_challenge(r.user_b, r.challenge_template_id));

  -- Honour the template's own length rather than a hardcoded 7 days —
  -- duration_days equality is a hard block in the matcher, so the two
  -- disagreeing was a real inconsistency.
  select coalesce(duration_days, 7) into v_days
  from public.challenge_templates where id = r.challenge_template_id;

  update public.user_challenges
  set partner_user_id = r.user_b, partner_state = 'partnered',
      status = 'active', started_at = now(),
      ends_at = now() + make_interval(days => coalesce(v_days, 7))
  where id = v_a_challenge;

  update public.user_challenges
  set partner_user_id = r.user_a, partner_state = 'partnered',
      status = 'active', started_at = now(),
      ends_at = now() + make_interval(days => coalesce(v_days, 7))
  where id = v_b_challenge;

  -- Close the requests out. Leaving them on 'matched' forever is what let
  -- stale rows pile up and collide with the one-waiting index later.
  update public.partner_match_requests
  set status = 'cancelled', updated_at = now()
  where user_challenge_id in (v_a_challenge, v_b_challenge)
    and status in ('waiting', 'matched');

  return jsonb_build_object('confirmed', true, 'both', true);
end;
$$;

-- ============================================================
-- 6. Per-challenge reads
-- ============================================================
create or replace function public.get_my_match(p_user_challenge_id uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  r record;
  v_name text; v_avatar text; v_blurb text; v_title text; v_days int;
  v_mine boolean; v_tz text; v_today date; v_used int; v_left int;
  v_searching boolean; v_no_match timestamptz;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select coalesce(timezone, 'UTC') into v_tz from public.profiles where id = v_uid;
  v_today := (now() at time zone coalesce(v_tz, 'UTC'))::date;
  select count(*) into v_used from public.partner_search_attempts
  where user_id = v_uid and local_date = v_today;
  v_left := greatest(public.daily_search_limit() - v_used, 0);

  select * into r from public.partner_matches
  where status = 'pending'
    and (user_a = v_uid or user_b = v_uid)
    and (p_user_challenge_id is null
         or user_challenge_a = p_user_challenge_id
         or user_challenge_b = p_user_challenge_id)
  order by created_at desc limit 1;

  if r.id is null then
    select (status = 'waiting'), no_match_at into v_searching, v_no_match
    from public.partner_match_requests
    where user_id = v_uid
      and (p_user_challenge_id is null or user_challenge_id = p_user_challenge_id)
    order by created_at desc limit 1;

    return jsonb_build_object(
      'matched', false,
      'searching', coalesce(v_searching, false),
      'no_match', coalesce(v_searching, false) and v_no_match is not null,
      'searches_left', v_left,
      'daily_limit', public.daily_search_limit()
    );
  end if;

  if r.user_a = v_uid then
    select full_name, avatar_url into v_name, v_avatar from public.profiles where id = r.user_b;
    v_blurb := r.blurb_about_b; v_mine := r.a_confirmed;
  else
    select full_name, avatar_url into v_name, v_avatar from public.profiles where id = r.user_a;
    v_blurb := r.blurb_about_a; v_mine := r.b_confirmed;
  end if;

  select title, duration_days into v_title, v_days
  from public.challenge_templates where id = r.challenge_template_id;

  return jsonb_build_object(
    'matched', true, 'match_id', r.id,
    'partner_first_name', split_part(coalesce(v_name, 'Someone'), ' ', 1),
    'partner_avatar_url', v_avatar,
    'blurb', v_blurb, 'habit', v_title, 'duration_days', v_days,
    'i_confirmed', v_mine,
    'they_confirmed', case when r.user_a = v_uid then r.b_confirmed else r.a_confirmed end,
    'i_requested', r.requested_by is null or r.requested_by = v_uid,
    'searches_left', v_left, 'daily_limit', public.daily_search_limit()
  );
end;
$$;

grant execute on function public.get_my_match(uuid) to authenticated;

-- get_partner_status gains an optional challenge argument. Null keeps the old
-- behaviour (most-recent challenge) so every existing caller is unaffected.
create or replace function public.get_partner_status(p_user_id uuid, p_user_challenge_id uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_partner_id uuid; v_state text; v_name text; v_avatar text;
  v_challenge_id uuid; v_partner_tz text; v_partner_today date;
  v_my_tz text; v_my_today date; v_nudged boolean := false;
  v_total int := 0; v_done int := 0; v_photos jsonb := '[]'::jsonb;
begin
  if auth.uid() is not null and auth.uid() <> p_user_id then
    raise exception 'not your status';
  end if;

  select partner_user_id, partner_state into v_partner_id, v_state
  from public.user_challenges
  where user_id = p_user_id and status in ('active', 'pending', 'paused')
    and (p_user_challenge_id is null or id = p_user_challenge_id)
  order by started_at desc
  limit 1;

  if v_partner_id is null or v_state <> 'partnered' then
    return jsonb_build_object('linked', false, 'partner_state', coalesce(v_state, 'solo'));
  end if;

  select full_name, avatar_url into v_name, v_avatar
  from public.profiles where id = v_partner_id;

  select coalesce(timezone, 'UTC') into v_partner_tz from public.profiles where id = v_partner_id;
  select coalesce(timezone, 'UTC') into v_my_tz from public.profiles where id = p_user_id;

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

    select coalesce(
      jsonb_agg(jsonb_build_object('id', tc.id, 'task_title', ct.title, 'photo_path', tc.photo_path)),
      '[]'::jsonb
    )
    into v_photos
    from public.challenge_tasks ct
    join public.task_checkins tc on tc.challenge_task_id = ct.id
    where ct.user_challenge_id = v_challenge_id
      and tc.status = 'completed'
      and tc.photo_path is not null
      and tc.photo_viewed_at is null
      and (tc.completed_at at time zone coalesce(v_partner_tz, 'UTC'))::date = v_partner_today;
  end if;

  select exists (
    select 1 from public.partner_nudges
    where from_user_id = p_user_id and to_user_id = v_partner_id and local_date = v_my_today
  ) into v_nudged;

  return jsonb_build_object(
    'linked', true, 'partner_state', v_state, 'partner_id', v_partner_id,
    'name', v_name, 'avatar_url', v_avatar,
    'total_tasks', v_total, 'completed_today', v_done,
    'checked_in_today', v_done > 0, 'nudged_today', v_nudged,
    'today_photos', v_photos
  );
end;
$$;

grant execute on function public.get_partner_status(uuid, uuid) to authenticated;
