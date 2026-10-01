-- Session details: running late, a nudge, cancelling, and an expired match.
--
-- WORK_DINESH_FRONTEND.md §15 and §18 describe one details screen for a
-- planned session. Three things on it had no backend:
--
--   Running late?   says so to the other person, on the day, before you arrive
--   Nudge           one tap, on the day, once per session
--   Cancel          needs the other person to agree. If they do not answer by
--                   the end of the asker's day, the plan stands
--
-- Move already exists (propose_reschedule / accept_reschedule) and is reused.
-- It is re-issued here only to start the day-of marks over on the new day and
-- to close a cancel request that was about the old one.
--
-- Cancelling is NEUTRAL to the streak: a cancelled plan is not a circle.
-- get_streak() already ignores status 'cancelled', and so do the one-open-plan
-- index and repair_state(), so nothing else has to change for that to hold.
--
-- §6 of the same document: a match that neither person answered in 24 hours
-- expires and both go back in the pool. sweep_expired_matches() does that, but
-- the client was told nothing, so get_my_match() gains one key, `expired`.

-- ============================================================
-- 1. Columns and the proposal field
-- ============================================================
alter table public.pair_plan_members
  add column if not exists late_minutes int,
  add column if not exists late_at timestamptz,
  add column if not exists nudged_at timestamptz;

do $$
begin
  alter table public.pair_plan_members
    add constraint pair_plan_members_late_minutes_check
    check (late_minutes is null or late_minutes between 5 and 60);
exception when duplicate_object then
  null;
end $$;

comment on column public.pair_plan_members.late_minutes is
  'How late this person said they are running, in minutes. Cleared when the session is moved.';
comment on column public.pair_plan_members.nudged_at is
  'When this person nudged their partner about this session. Once per session.';

alter table public.pair_proposals drop constraint if exists pair_proposals_field_check;
alter table public.pair_proposals add constraint pair_proposals_field_check
  check (field = any (array['distance', 'cadence', 'mode', 'place', 'time', 'day_time', 'reschedule', 'cancel']));

-- ============================================================
-- 2. Helpers
-- ============================================================
-- Is this session today, for this person? Their own time where they have one
-- (separate mode can have a time each), in their own timezone.
create or replace function public.plan_is_today(p public.pair_plans, p_user uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((
    select (coalesce(m.planned_at, p.starts_at) at time zone coalesce(pr.timezone, 'UTC'))::date
           = (now() at time zone coalesce(pr.timezone, 'UTC'))::date
    from public.pair_plan_members m
    join public.profiles pr on pr.id = m.user_id
    where m.plan_id = p.id and m.user_id = p_user
  ), false);
$$;
revoke all on function public.plan_is_today(public.pair_plans, uuid) from public, anon, authenticated;

create or replace function public.activity_noun(p_key text)
returns text language sql immutable as $$
  select case p_key
    when 'running' then 'run' when 'jogging' then 'jog' when 'walking' then 'walk'
    when 'cycling' then 'ride' when 'yoga' then 'yoga session' when 'home_workouts' then 'workout'
    else 'session' end;
$$;

-- ============================================================
-- 3. Running late
-- ============================================================
create or replace function public.set_running_late(p_plan_id uuid, p_minutes int)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare v_uid uuid := auth.uid(); p public.pair_plans; v_other uuid; v_here timestamptz;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  p := public.my_plan_member(p_plan_id);
  if p.id is null or p.status <> 'confirmed' then return jsonb_build_object('ok', false, 'reason', 'no_plan'); end if;
  -- Only a meetup has someone waiting somewhere.
  if p.mode is distinct from 'together' then return jsonb_build_object('ok', false, 'reason', 'not_meetup'); end if;
  if not public.plan_is_today(p, v_uid) then return jsonb_build_object('ok', false, 'reason', 'not_today'); end if;
  if p_minutes is null or p_minutes < 5 or p_minutes > 60 then
    return jsonb_build_object('ok', false, 'reason', 'bad_minutes');
  end if;
  select here_at into v_here from public.pair_plan_members where plan_id = p.id and user_id = v_uid;
  if v_here is not null then return jsonb_build_object('ok', false, 'reason', 'already_here'); end if;

  update public.pair_plan_members set late_minutes = p_minutes, late_at = now()
  where plan_id = p.id and user_id = v_uid;

  v_other := public.plan_other(p, v_uid);
  perform public.notify_user(v_other, 'plan_update',
    public.first_name_of(v_uid) || ' is running about ' || p_minutes || ' minutes late',
    'Still coming.',
    '/challenge/' || public.plan_my_challenge(p, v_other), '{}'::jsonb);
  return jsonb_build_object('ok', true);
end; $$;
revoke all on function public.set_running_late(uuid, int) from public, anon;
grant execute on function public.set_running_late(uuid, int) to authenticated;

-- ============================================================
-- 4. The nudge
-- ============================================================
-- One per person per session, and only on the day. The update is the rate
-- limit: two taps race for the same row and only one finds nudged_at null.
create or replace function public.nudge_session(p_plan_id uuid)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare v_uid uuid := auth.uid(); p public.pair_plans; v_other uuid; o record;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  p := public.my_plan_member(p_plan_id);
  if p.id is null or p.status <> 'confirmed' then return jsonb_build_object('ok', false, 'reason', 'no_plan'); end if;
  if not public.plan_is_today(p, v_uid) then return jsonb_build_object('ok', false, 'reason', 'not_today'); end if;

  v_other := public.plan_other(p, v_uid);
  select here_at, checkin into o from public.pair_plan_members where plan_id = p.id and user_id = v_other;
  -- Nothing to nudge about: they are there, or they have done it.
  if o.here_at is not null or o.checkin = 'done' then
    return jsonb_build_object('ok', false, 'reason', 'already_done');
  end if;

  update public.pair_plan_members set nudged_at = now()
  where plan_id = p.id and user_id = v_uid and nudged_at is null;
  if not found then return jsonb_build_object('ok', false, 'reason', 'already_nudged'); end if;

  perform public.notify_user(v_other, 'partner_nudge',
    public.first_name_of(v_uid) || ' nudged you',
    'Your ' || public.activity_noun(p.activity_key) || ' is today.',
    '/challenge/' || public.plan_my_challenge(p, v_other), '{}'::jsonb);
  return jsonb_build_object('ok', true);
end; $$;
revoke all on function public.nudge_session(uuid) from public, anon;
grant execute on function public.nudge_session(uuid) to authenticated;

-- ============================================================
-- 5. Cancelling
-- ============================================================
-- Asking. The request lapses at the end of the asker's own day: past that the
-- plan stands, and the row is simply ignored (answer_cancel refuses it, and
-- the client reads expires_at). No sweep is needed to enforce it.
create or replace function public.propose_cancel(p_plan_id uuid)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid(); p public.pair_plans; v_other uuid; v_tz text; v_until timestamptz;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  p := public.my_plan_member(p_plan_id);
  if p.id is null or p.status <> 'confirmed' then return jsonb_build_object('ok', false, 'reason', 'no_plan'); end if;
  v_other := public.plan_other(p, v_uid);

  -- They already asked, and it is still live: the answer is theirs to get.
  if exists (
    select 1 from public.pair_proposals
    where plan_id = p.id and field = 'cancel' and status = 'open' and proposed_by = v_other
      and (value ->> 'expires_at')::timestamptz > now()
  ) then
    return jsonb_build_object('ok', false, 'reason', 'they_asked');
  end if;

  select coalesce(timezone, 'UTC') into v_tz from public.profiles where id = v_uid;
  begin
    v_until := (((now() at time zone v_tz)::date + 1)::timestamp) at time zone v_tz;
  exception when others then
    v_until := (((now() at time zone 'UTC')::date + 1)::timestamp) at time zone 'UTC';
  end;

  update public.pair_proposals set status = 'superseded', responded_at = now()
  where plan_id = p.id and field = 'cancel' and status = 'open';
  insert into public.pair_proposals (plan_id, field, proposed_by, value, round)
  values (p.id, 'cancel', v_uid, jsonb_build_object('expires_at', v_until),
          1 + (select count(*) from public.pair_proposals where plan_id = p.id and field = 'cancel'));

  perform public.notify_user(v_other, 'plan_update',
    public.first_name_of(v_uid) || ' asked to cancel your ' || public.activity_noun(p.activity_key),
    'It stays on unless you agree by the end of today.',
    '/challenge/' || public.plan_my_challenge(p, v_other), '{}'::jsonb);
  return jsonb_build_object('ok', true, 'expires_at', v_until);
end; $$;
revoke all on function public.propose_cancel(uuid) from public, anon;
grant execute on function public.propose_cancel(uuid) to authenticated;

-- Answering. Only the OTHER person can, and only while it is live.
create or replace function public.answer_cancel(p_proposal_id uuid, p_agree boolean)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare v_uid uuid := auth.uid(); r record; p public.pair_plans;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select * into r from public.pair_proposals
  where id = p_proposal_id and field = 'cancel' and status = 'open' for update;
  if r.id is null then return jsonb_build_object('ok', false, 'reason', 'not_open'); end if;
  p := public.my_plan_member(r.plan_id);
  if p.id is null or r.proposed_by = v_uid then return jsonb_build_object('ok', false, 'reason', 'not_yours'); end if;

  if (r.value ->> 'expires_at')::timestamptz <= now() then
    update public.pair_proposals set status = 'superseded', responded_at = now() where id = r.id;
    return jsonb_build_object('ok', false, 'reason', 'expired');
  end if;
  if p.status <> 'confirmed' then return jsonb_build_object('ok', false, 'reason', 'no_plan'); end if;

  if not coalesce(p_agree, false) then
    update public.pair_proposals set status = 'withdrawn', responded_at = now() where id = r.id;
    perform public.notify_user(r.proposed_by, 'plan_update',
      public.first_name_of(v_uid) || ' wants to keep it on',
      'Your ' || public.activity_noun(p.activity_key) || ' is still planned.',
      '/challenge/' || public.plan_my_challenge(p, r.proposed_by), '{}'::jsonb);
    return jsonb_build_object('ok', true, 'cancelled', false);
  end if;

  update public.pair_proposals set status = 'accepted', responded_at = now() where id = r.id;
  update public.pair_proposals set status = 'superseded', responded_at = now()
  where plan_id = p.id and status = 'open';
  -- Cancelled, not missed: no circle, nothing owed.
  update public.pair_plans set status = 'cancelled', qr_nonce = null, updated_at = now() where id = p.id;
  update public.meetup_chats set closed_at = now(), close_reason = 'ended'
  where plan_id = p.id and closed_at is null;

  perform public.notify_user(r.proposed_by, 'plan_update',
    public.first_name_of(v_uid) || ' agreed to cancel',
    'Plan your next ' || public.activity_noun(p.activity_key) || ' when you are ready.',
    '/(tabs)/challenges', '{}'::jsonb);
  return jsonb_build_object('ok', true, 'cancelled', true);
end; $$;
revoke all on function public.answer_cancel(uuid, boolean) from public, anon;
grant execute on function public.answer_cancel(uuid, boolean) to authenticated;

-- ============================================================
-- 6. Move: start the day over, and close a stale cancel request
-- ============================================================
-- Latest body: 202609232000_meetup_chat.sql. Two additions, marked.
create or replace function public.accept_reschedule(p_proposal_id uuid)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare v_uid uuid := auth.uid(); r record; p public.pair_plans; v_at timestamptz;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select * into r from public.pair_proposals where id = p_proposal_id and field = 'reschedule' and status = 'open' for update;
  if r.id is null then return jsonb_build_object('ok', false, 'reason', 'not_open'); end if;
  p := public.my_plan_member(r.plan_id);
  if p.id is null or r.proposed_by = v_uid then return jsonb_build_object('ok', false, 'reason', 'not_yours'); end if;
  v_at := (r.value ->> 'starts_at')::timestamptz;
  update public.pair_proposals set status = 'accepted', responded_at = now() where id = r.id;
  -- A fresh day: everyone's day-of state resets; the plan itself stays on.
  update public.pair_plans set starts_at = v_at, qr_nonce = null, updated_at = now() where id = p.id;
  update public.pair_plan_members
  set planned_at = v_at, on_my_way_at = null, here_at = null, cant_make_it_at = null,
      checkin = null, checkin_at = null,
      -- A new day: the reminder, the nudge and any "running late" start over.
      reminded_at = null, nudged_at = null, late_minutes = null, late_at = null
  where plan_id = p.id;
  -- A cancel request was about the old time. Moving the session answers it.
  update public.pair_proposals set status = 'superseded', responded_at = now()
  where plan_id = p.id and field = 'cancel' and status = 'open';
  -- §6.3: a reschedule chat closes only once BOTH sides have confirmed the
  -- new time — the proposer by proposing it, the other by accepting it.
  update public.meetup_chats set closed_at = now(), close_reason = 'rescheduled'
  where plan_id = p.id and closed_at is null;

  perform public.notify_user(r.proposed_by, 'plan_reschedule',
    public.first_name_of(v_uid) || ' accepted the change', null,
    '/plan/' || public.plan_my_challenge(p, r.proposed_by), '{}'::jsonb);
  return jsonb_build_object('ok', true);
end; $$;

revoke all on function public.accept_reschedule(uuid) from public, anon;
grant execute on function public.accept_reschedule(uuid) to authenticated;

-- ============================================================
-- 7. An expired match says so
-- ============================================================
-- Latest body: 202610011000_my_match_returns_expires_at.sql. One added key,
-- `expired`, on the not-matched branch.
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
  v_searching boolean; v_no_match timestamptz; v_expired boolean;
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

    -- The last match ran out of time, recently, and nothing has replaced it.
    -- Without this the offer simply vanishes and the radar comes back with no
    -- word about why.
    select exists (
      select 1 from public.partner_matches m
      where m.status = 'expired'
        and (m.user_a = v_uid or m.user_b = v_uid)
        and m.expires_at > now() - interval '24 hours'
        and not exists (
          select 1 from public.partner_matches n
          where (n.user_a = v_uid or n.user_b = v_uid) and n.created_at > m.created_at
        )
    ) into v_expired;

    return jsonb_build_object(
      'matched', false,
      'expired', coalesce(v_searching, false) and v_expired,
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
    -- One clock, started when the match was created, the same for both people.
    'expires_at', r.expires_at,
    'searches_left', v_left, 'daily_limit', public.daily_search_limit()
  );
end;
$$;

revoke all on function public.get_my_match(uuid) from public, anon;
grant execute on function public.get_my_match(uuid) to authenticated;

notify pgrst, 'reload schema';
