-- Partner path (Step 3 spec) + the single-challenge model the Challenges tab
-- v3 spec requires.
--
-- WHY THE MODEL CHANGES
--
-- Until now every user carried TWO live challenges: a solo track (always
-- active) and a partner track (pending until someone accepted). The v3
-- Challenges tab is built on one heart whose LEFT half is you and RIGHT half
-- is your partner -- that is a single challenge with an optional partner, not
-- two parallel ones. Two rows cannot express one heart.
--
-- So: one live challenge per user, carrying who the partner is and how the
-- partnership came about. This migration is safe to write cleanly because the
-- database was reset earlier today -- there are no rows to migrate. A backfill
-- is included anyway so re-running against a populated database cannot strand
-- anyone on a second row.
--
-- accountability_mode is left in place and pinned to 'solo'. It is now
-- vestigial: partner_state carries the meaning. It survives only because the
-- column is NOT NULL under a check constraint and getActiveChallenge still
-- filters on it.

-- ============================================================
-- 1. The partner slot on a challenge
-- ============================================================
alter table public.user_challenges
  add column if not exists partner_user_id uuid references auth.users(id) on delete set null,
  add column if not exists partner_state text not null default 'solo';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'user_challenges_partner_state_check'
  ) then
    alter table public.user_challenges
      add constraint user_challenges_partner_state_check
      check (partner_state in ('solo', 'invited', 'finding', 'matched', 'partnered'));
  end if;
end $$;

--   solo      -- no partner, not looking. The dashed half.
--   invited   -- invite sent, waiting on a specific person.
--   finding   -- in the matching pool. The pulsing half.
--   matched   -- paired, waiting for one or both to confirm.
--   partnered -- confirmed and live. The filled half.

create index if not exists user_challenges_partner_idx
  on public.user_challenges (partner_user_id) where partner_user_id is not null;

-- ============================================================
-- 2. Collapse any existing pair of tracks into one row
--
-- No-op on the current (empty) database. Keeps the partner track when it has a
-- real partner, otherwise the solo one, and retires the loser as 'abandoned'
-- rather than deleting it so nothing referencing it breaks.
-- ============================================================
do $$
declare
  r record;
  v_keep uuid;
  v_partner uuid;
begin
  for r in
    select user_id from public.user_challenges
    where status in ('active', 'pending', 'paused')
    group by user_id having count(*) > 1
  loop
    -- The partner on the most recent accepted invite, if there is one.
    select case when invited_by = r.user_id then accepted_by else invited_by end
      into v_partner
    from public.challenge_invites
    where status = 'accepted' and (invited_by = r.user_id or accepted_by = r.user_id)
    order by accepted_at desc nulls last
    limit 1;

    select id into v_keep
    from public.user_challenges
    where user_id = r.user_id and status in ('active', 'pending', 'paused')
    order by
      (accountability_mode = 'partner' and v_partner is not null) desc,
      (accountability_mode = 'solo') desc,
      started_at desc
    limit 1;

    update public.user_challenges
    set status = 'abandoned'
    where user_id = r.user_id
      and status in ('active', 'pending', 'paused')
      and id <> v_keep;

    update public.user_challenges
    set accountability_mode = 'solo',
        status = 'active',
        partner_user_id = v_partner,
        partner_state = case when v_partner is not null then 'partnered' else 'solo' end
    where id = v_keep;
  end loop;
end $$;

-- ============================================================
-- 3. ensure_user_challenge — provision the ONE challenge
--
-- Replaces ensure_default_challenges, which existed only to create two rows.
-- The old name is dropped so nothing can call it and quietly recreate a second
-- track.
-- ============================================================
drop function if exists public.ensure_default_challenges(uuid, uuid, uuid, text);

create or replace function public.ensure_user_challenge(
  p_user_id uuid,
  p_template_id uuid default null,
  p_custom_habit_title text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing uuid;
  v_template uuid;
  v_custom text := nullif(btrim(coalesce(p_custom_habit_title, '')), '');
  v_title text;
  v_id uuid;
begin
  select id into v_existing
  from public.user_challenges
  where user_id = p_user_id and status in ('active', 'pending', 'paused')
  order by started_at desc
  limit 1;

  if v_existing is not null then
    return v_existing;
  end if;

  -- Retired templates are excluded so nobody is seeded onto a habit the
  -- picker has stopped offering.
  select coalesce(
    p_template_id,
    (select id from public.challenge_templates where is_active order by sort_order, created_at limit 1)
  ) into v_template;

  if v_template is null then
    return null;
  end if;

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

-- ============================================================
-- 4. The matching pool
--
-- Manual/concierge by design: no algorithm, no auto-pairing. A row here means
-- "this person is waiting"; Dinesh reads the pool and inserts a partner_matches
-- row by hand.
-- ============================================================
create table if not exists public.partner_match_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  user_challenge_id uuid not null references public.user_challenges(id) on delete cascade,
  challenge_template_id uuid not null references public.challenge_templates(id) on delete restrict,
  -- Matters for the hyperlocal seeding plan: avoid pairing across very
  -- different time zones.
  timezone text,
  status text not null default 'waiting' check (status in ('waiting', 'matched', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One live request per person. Partial, so cancelled and matched rows stay as
-- history without blocking a fresh request.
create unique index if not exists partner_match_requests_one_waiting
  on public.partner_match_requests (user_id) where status = 'waiting';

create index if not exists partner_match_requests_pool_idx
  on public.partner_match_requests (challenge_template_id, status, created_at);

alter table public.partner_match_requests enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'partner_match_requests' and policyname = 'pmr_own_select') then
    create policy pmr_own_select on public.partner_match_requests
      for select using (user_id = auth.uid());
  end if;
end $$;

-- ============================================================
-- 5. Matches, and the two-sided confirmation
--
-- Matched pairs are strangers, so both must agree before Day 1. If either
-- declines, both go back to the pool.
--
-- blurb_about_* is the one human line each side reads about the other on the
-- match card. It is written at pairing time rather than read live out of the
-- other person's reflections: before confirmation these two are strangers, and
-- a curated sentence is the right amount of exposure. Reflections become
-- mutually visible once the pairing is confirmed (section 7).
-- ============================================================
create table if not exists public.partner_matches (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references auth.users(id) on delete cascade,
  user_b uuid not null references auth.users(id) on delete cascade,
  challenge_template_id uuid not null references public.challenge_templates(id) on delete restrict,
  blurb_about_a text,
  blurb_about_b text,
  a_confirmed boolean not null default false,
  b_confirmed boolean not null default false,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'declined', 'expired')),
  declined_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint partner_matches_distinct check (user_a <> user_b)
);

create index if not exists partner_matches_user_a_idx on public.partner_matches (user_a, status);
create index if not exists partner_matches_user_b_idx on public.partner_matches (user_b, status);

alter table public.partner_matches enable row level security;

-- Read is via get_my_match() only. No direct select policy: the row holds the
-- other person's identity, and the RPC decides what crosses.

-- ============================================================
-- 6. Pool and match RPCs
-- ============================================================

-- Enter the pool. Custom habits are rejected: the Step 3 spec hides Find for
-- them because nobody else is doing a habit you invented.
create or replace function public.join_match_pool(
  p_user_challenge_id uuid,
  p_timezone text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_owner uuid;
  v_template uuid;
  v_custom text;
  v_id uuid;
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

  insert into public.partner_match_requests(
    user_id, user_challenge_id, challenge_template_id, timezone)
  values (v_uid, p_user_challenge_id, v_template, p_timezone)
  on conflict (user_id) where status = 'waiting'
  do update set user_challenge_id = excluded.user_challenge_id,
                challenge_template_id = excluded.challenge_template_id,
                timezone = excluded.timezone,
                updated_at = now()
  returning id into v_id;

  update public.user_challenges
  set partner_state = 'finding'
  where id = p_user_challenge_id;

  return v_id;
end;
$$;

create or replace function public.leave_match_pool(p_user_challenge_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  update public.partner_match_requests
  set status = 'cancelled', updated_at = now()
  where user_id = v_uid and status = 'waiting';

  update public.user_challenges
  set partner_state = 'solo'
  where id = p_user_challenge_id and user_id = v_uid and partner_state = 'finding';
end;
$$;

-- What the match card shows. First name and one line only -- never the other
-- person's email, surname, or raw reflections.
create or replace function public.get_my_match()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  r record;
  v_other uuid;
  v_blurb text;
  v_mine boolean;
  v_name text;
  v_title text;
  v_days int;
begin
  if v_uid is null then
    return jsonb_build_object('matched', false);
  end if;

  select * into r
  from public.partner_matches
  where status = 'pending' and (user_a = v_uid or user_b = v_uid)
  order by created_at desc
  limit 1;

  if r.id is null then
    return jsonb_build_object('matched', false);
  end if;

  if r.user_a = v_uid then
    v_other := r.user_b; v_blurb := r.blurb_about_b; v_mine := r.a_confirmed;
  else
    v_other := r.user_a; v_blurb := r.blurb_about_a; v_mine := r.b_confirmed;
  end if;

  select split_part(coalesce(full_name, 'Your partner'), ' ', 1) into v_name
  from public.profiles where id = v_other;

  select title, duration_days into v_title, v_days
  from public.challenge_templates where id = r.challenge_template_id;

  return jsonb_build_object(
    'matched', true,
    'match_id', r.id,
    'partner_first_name', v_name,
    'blurb', v_blurb,
    'habit', v_title,
    'duration_days', v_days,
    'i_confirmed', v_mine
  );
end;
$$;

-- Confirm my side. The pairing only goes live when both have.
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

  -- Both in: light the pairing on each side.
  update public.partner_matches
  set status = 'confirmed', updated_at = now() where id = r.id;

  select public.ensure_user_challenge(r.user_a, r.challenge_template_id) into v_a_challenge;
  select public.ensure_user_challenge(r.user_b, r.challenge_template_id) into v_b_challenge;

  update public.user_challenges
  set partner_user_id = r.user_b, partner_state = 'partnered',
      status = 'active', started_at = now(), ends_at = now() + interval '7 days'
  where id = v_a_challenge;

  update public.user_challenges
  set partner_user_id = r.user_a, partner_state = 'partnered',
      status = 'active', started_at = now(), ends_at = now() + interval '7 days'
  where id = v_b_challenge;

  update public.partner_match_requests
  set status = 'matched', updated_at = now()
  where user_id in (r.user_a, r.user_b) and status = 'waiting';

  return jsonb_build_object('confirmed', true, 'both', true);
end;
$$;

-- Either side declining returns BOTH people to the pool -- the other person
-- must not be left believing they have a partner.
create or replace function public.decline_match(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  r record;
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

  update public.partner_matches
  set status = 'declined', declined_by = v_uid, updated_at = now()
  where id = r.id;

  -- Back into the pool, both of them, with their challenges still 'finding'.
  update public.partner_match_requests
  set status = 'waiting', updated_at = now()
  where user_id in (r.user_a, r.user_b) and status = 'matched';

  update public.user_challenges
  set partner_state = 'finding'
  where user_id in (r.user_a, r.user_b)
    and status in ('active', 'pending', 'paused')
    and partner_state in ('matched', 'finding');
end;
$$;

-- ============================================================
-- 7. Reflections become mutually visible to a CONFIRMED partner
--
-- This reverses the owner-only rule from 202608131000. That migration followed
-- the Challenge Setup spec, which said a partner never sees these; the Step 3
-- spec and a product decision on 2026-08-13 changed it so a partner can read
-- your reasons.
--
-- Two limits kept deliberately: only a partner whose pairing is live (never a
-- pending match, never a stranger in the pool), and read only -- nobody can
-- edit anyone else's answers.
--
-- Safe to change with no retroactive exposure: the database was reset earlier
-- today, so no answer was ever written under the old promise. The Step 2 screen
-- now says plainly that a partner will read these.
-- ============================================================
create or replace function public.is_my_partner(p_other uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_challenges
    where user_id = auth.uid()
      and partner_user_id = p_other
      and partner_state = 'partnered'
      and status in ('active', 'paused')
  );
$$;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'challenge_reflections' and policyname = 'challenge_reflections_partner_select') then
    create policy challenge_reflections_partner_select on public.challenge_reflections
      for select using (public.is_my_partner(user_id));
  end if;
end $$;

-- ============================================================
-- 8. Invite acceptance, on the single-challenge model
-- ============================================================
create or replace function public.accept_challenge_invite(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public, net, extensions
as $$
declare
  v_invite_id uuid;
  v_user_challenge_id uuid;
  v_invited_by uuid;
  v_status text;
  v_accepted_by uuid;
  v_template_id uuid;
  v_custom_title text;
  v_my_challenge_id uuid;
  v_uid uuid := auth.uid();
  v_already_accepted boolean := false;
  v_joiner_name text;
  v_key text;
  v_url text;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select id, user_challenge_id, invited_by, status, accepted_by
    into v_invite_id, v_user_challenge_id, v_invited_by, v_status, v_accepted_by
  from public.challenge_invites
  where token = p_token
  limit 1;

  if v_invite_id is null then
    raise exception 'invite not found';
  end if;
  if v_invited_by = v_uid then
    raise exception 'you cannot accept your own invite';
  end if;

  if v_status = 'pending' then
    update public.challenge_invites
    set status = 'accepted', accepted_by = v_uid, accepted_at = now()
    where id = v_invite_id;
  elsif v_status = 'accepted' and v_accepted_by = v_uid then
    v_already_accepted := true;
  else
    raise exception 'this invite has already been used by someone else';
  end if;

  -- The inviter's challenge, whether or not the invite carried its id.
  if v_user_challenge_id is null then
    select id into v_user_challenge_id
    from public.user_challenges
    where user_id = v_invited_by and status in ('active', 'pending', 'paused')
    order by started_at desc
    limit 1;
  end if;

  select challenge_template_id, custom_habit_title
    into v_template_id, v_custom_title
  from public.user_challenges where id = v_user_challenge_id;

  -- The accepter joins the SAME habit, custom wording included.
  select public.ensure_user_challenge(v_uid, v_template_id, v_custom_title)
    into v_my_challenge_id;

  update public.user_challenges
  set challenge_template_id = v_template_id,
      custom_habit_title = v_custom_title,
      partner_user_id = v_invited_by,
      partner_state = 'partnered',
      status = 'active'
  where id = v_my_challenge_id;

  update public.challenge_tasks
  set title = coalesce(
    v_custom_title,
    (select title from public.challenge_templates where id = v_template_id),
    title)
  where user_challenge_id = v_my_challenge_id;

  update public.user_challenges
  set partner_user_id = v_uid,
      partner_state = 'partnered',
      status = 'active'
  where id = v_user_challenge_id;

  -- Neither side is still hunting.
  update public.partner_match_requests
  set status = 'cancelled', updated_at = now()
  where user_id in (v_uid, v_invited_by) and status = 'waiting';

  if not v_already_accepted then
    begin
      select value into v_key from public.app_config where key = 'service_role_key';
      select value into v_url from public.app_config where key = 'functions_base_url';
      select coalesce(full_name, 'Your partner') into v_joiner_name
      from public.profiles where id = v_uid;

      if v_key is not null and v_url is not null then
        perform net.http_post(
          url := v_url || '/send-push',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || v_key
          ),
          body := jsonb_build_object(
            'userId', v_invited_by,
            'kind', 'partner_activity',
            'title', split_part(v_joiner_name, ' ', 1) || ' joined your challenge',
            'body', 'You''re both in — your challenge starts now.',
            'route', '/(tabs)/home'
          )
        );
      end if;
    exception when others then
      raise notice 'accept_challenge_invite: join notification failed, pairing kept';
    end;
  end if;

  return v_user_challenge_id;
end;
$$;

-- ============================================================
-- 9. get_partner_status reads the challenge, not the invite
--
-- The pairing now lives on the challenge row, which also covers matched
-- partners -- who never had an invite at all.
-- ============================================================
create or replace function public.get_partner_status(p_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_partner_id uuid;
  v_state text;
  v_name text;
  v_avatar text;
  v_challenge_id uuid;
  v_total int := 0;
  v_done int := 0;
begin
  select partner_user_id, partner_state into v_partner_id, v_state
  from public.user_challenges
  where user_id = p_user_id and status in ('active', 'pending', 'paused')
  order by started_at desc
  limit 1;

  if v_partner_id is null or v_state <> 'partnered' then
    return jsonb_build_object('linked', false, 'partner_state', coalesce(v_state, 'solo'));
  end if;

  select full_name, avatar_url into v_name, v_avatar
  from public.profiles where id = v_partner_id;

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
      and (tc.completed_at at time zone 'utc')::date = (now() at time zone 'utc')::date;
  end if;

  return jsonb_build_object(
    'linked', true,
    'partner_state', v_state,
    'partner_id', v_partner_id,
    'name', v_name,
    'avatar_url', v_avatar,
    'total_tasks', v_total,
    'completed_today', v_done,
    'checked_in_today', v_done > 0
  );
end;
$$;

grant execute on function public.ensure_user_challenge(uuid, uuid, text) to authenticated;
grant execute on function public.join_match_pool(uuid, text) to authenticated;
grant execute on function public.leave_match_pool(uuid) to authenticated;
grant execute on function public.get_my_match() to authenticated;
grant execute on function public.confirm_match(uuid) to authenticated;
grant execute on function public.decline_match(uuid) to authenticated;
grant execute on function public.is_my_partner(uuid) to authenticated;
grant execute on function public.accept_challenge_invite(text) to authenticated;
grant execute on function public.get_partner_status(uuid) to authenticated, service_role;

notify pgrst, 'reload schema';
