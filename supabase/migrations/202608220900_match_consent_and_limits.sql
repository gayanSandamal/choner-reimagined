-- Make matching a two-sided, answerable proposal instead of a silent pairing.
--
-- Three gaps this closes:
--
-- 1. NO "WE COULDN'T MATCH YOU" STATE. The Find screen has exactly one waiting
--    state and it implies imminence. Somebody the matcher cannot place -- and
--    with a low commitment signal that can be permanent, not slow -- watched
--    "usually within a minute or two" forever. The matcher now records when it
--    looked and found nobody, so the screen can say so honestly.
--
-- 2. NO SENSE OF WHO ASKED. Both people are in the pool, but one of them
--    triggered this particular pairing by tapping Find; the other was sitting
--    waiting. They deserve different questions -- "here's who we found, keep
--    them?" versus "this person wants to do it with you, yes or no?" -- and
--    that needs recording which is which.
--
-- 3. NO LIMIT. Nothing stopped someone declining and re-searching endlessly,
--    which burns the pool's anchors and, once notifications exist, spams
--    whoever gets proposed. Three searches a day, in the user's own timezone.

-- ============================================================
-- 1. Who asked for this pairing
-- ============================================================
alter table public.partner_matches
  add column if not exists requested_by uuid references auth.users(id) on delete set null;

comment on column public.partner_matches.requested_by is
  'The user whose Find tap produced this match. Null when the periodic sweep '
  'paired two people who were both already waiting, in which case neither side '
  'is "the requester" and both get the same question.';

-- ============================================================
-- 2. When we looked and came back empty
-- ============================================================
alter table public.partner_match_requests
  add column if not exists last_searched_at timestamptz,
  add column if not exists no_match_at timestamptz;

comment on column public.partner_match_requests.no_match_at is
  'Set when a matching run considered this person and found nobody who cleared '
  'the score floor. Cleared when they are matched. Drives the honest "nobody '
  'suitable right now" state rather than an indefinite spinner.';

-- ============================================================
-- 3. Three searches a day
-- ============================================================
--
-- A row per search rather than a counter, because "how many today" has to be
-- asked in the user's OWN day and a counter would need resetting by something.
-- Rows also leave a trail worth having when tuning the limit later.
create table if not exists public.partner_search_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  local_date date not null,
  created_at timestamptz not null default now()
);

create index if not exists partner_search_attempts_user_day_idx
  on public.partner_search_attempts (user_id, local_date);

alter table public.partner_search_attempts enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'partner_search_attempts' and policyname = 'own_attempts_select'
  ) then
    create policy own_attempts_select on public.partner_search_attempts
      for select to authenticated using (user_id = auth.uid());
  end if;
end $$;

grant select on public.partner_search_attempts to authenticated;

create or replace function public.daily_search_limit()
returns integer language sql immutable as $$ select 3 $$;

-- ============================================================
-- 4. join_match_pool -- now rate limited, and records the attempt
-- ============================================================
create or replace function public.join_match_pool(
  p_user_challenge_id uuid,
  p_timezone text default null
) returns uuid
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

  select coalesce(timezone, 'UTC') into v_tz from public.profiles where id = v_uid;
  v_today := (now() at time zone coalesce(v_tz, 'UTC'))::date;

  select exists (
    select 1 from public.partner_match_requests
    where user_id = v_uid and status = 'waiting'
  ) into v_already_waiting;

  -- Re-entering a pool you are already in is not a new search. Without this,
  -- any screen that calls join on mount would silently eat the daily budget.
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

  insert into public.partner_match_requests(
    user_id, user_challenge_id, challenge_template_id, timezone)
  values (v_uid, p_user_challenge_id, v_template, p_timezone)
  on conflict (user_id) where status = 'waiting'
  do update set user_challenge_id = excluded.user_challenge_id,
                challenge_template_id = excluded.challenge_template_id,
                timezone = excluded.timezone,
                no_match_at = null,
                updated_at = now()
  returning id into v_id;

  update public.user_challenges
  set partner_state = 'finding'
  where id = p_user_challenge_id;

  begin
    select value into v_key from public.app_config where key = 'service_role_key';
    select value into v_url from public.app_config where key = 'functions_base_url';

    if v_key is not null and v_url is not null then
      perform net.http_post(
        url := v_url || '/partner-match',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_key
        ),
        body := jsonb_build_object('userId', v_uid::text)
      );
    else
      raise notice 'join_match_pool: app_config missing, leaving it to the cron';
    end if;
  exception when others then
    raise notice 'join_match_pool: immediate match failed, leaving it to the cron';
  end;

  return v_id;
end;
$$;

grant execute on function public.join_match_pool(uuid, text) to authenticated;

-- ============================================================
-- 5. record_match_search -- what the matcher reports back
-- ============================================================
create or replace function public.record_match_search(p_user_id uuid, p_found boolean)
returns void
language sql
security definer
set search_path = public
as $$
  update public.partner_match_requests
  set last_searched_at = now(),
      no_match_at = case when p_found then null else now() end,
      updated_at = now()
  where user_id = p_user_id and status = 'waiting';
$$;

revoke all on function public.record_match_search(uuid, boolean) from public, anon, authenticated;

-- ============================================================
-- 6. get_my_match -- now answers "what is happening" for every state
-- ============================================================
--
-- The Find screen needs more than "is there a match": whether we already looked
-- and found nobody, how many searches are left today, and -- when there IS a
-- match -- whether this user is the one who asked, because that decides which
-- question they are shown.
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
  v_tz text;
  v_today date;
  v_used int;
  v_left int;
  v_no_match timestamptz;
  v_searching boolean;
begin
  if v_uid is null then
    return jsonb_build_object('matched', false);
  end if;

  select coalesce(timezone, 'UTC') into v_tz from public.profiles where id = v_uid;
  v_today := (now() at time zone coalesce(v_tz, 'UTC'))::date;

  select count(*) into v_used
  from public.partner_search_attempts
  where user_id = v_uid and local_date = v_today;
  v_left := greatest(public.daily_search_limit() - v_used, 0);

  select (status = 'waiting'), no_match_at into v_searching, v_no_match
  from public.partner_match_requests
  where user_id = v_uid
  order by created_at desc
  limit 1;

  select * into r
  from public.partner_matches
  where status = 'pending' and (user_a = v_uid or user_b = v_uid)
  order by created_at desc
  limit 1;

  if r.id is null then
    return jsonb_build_object(
      'matched', false,
      'searching', coalesce(v_searching, false),
      -- Only meaningful while still waiting: a stale no_match_at on somebody who
      -- has since stopped looking would show them a dead end they left behind.
      'no_match', coalesce(v_searching, false) and v_no_match is not null,
      'searches_left', v_left,
      'daily_limit', public.daily_search_limit()
    );
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
    'i_confirmed', v_mine,
    'they_confirmed', case when r.user_a = v_uid then r.b_confirmed else r.a_confirmed end,
    -- Null requested_by means the sweep paired two people who were both already
    -- waiting; neither asked for this one specifically, so both are treated as
    -- requesters and get the same wording.
    'i_requested', r.requested_by is null or r.requested_by = v_uid,
    'searches_left', v_left,
    'daily_limit', public.daily_search_limit()
  );
end;
$$;

-- ============================================================
-- 7. find_another_match -- "not this one, try again"
-- ============================================================
--
-- Distinct from decline_match, which is symmetric and returns both people to the
-- pool. This is the requester saying "keep looking for ME": it declines the
-- pairing (so neither is re-proposed to the other -- get_match_pool reads
-- declined matches into previouslyUnmatchedWith), spends one of the day's
-- searches, and immediately looks again.
create or replace function public.find_another_match(p_match_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, net, extensions
as $$
declare
  v_uid uuid := auth.uid();
  r record;
  v_tz text;
  v_today date;
  v_used int;
  v_key text;
  v_url text;
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

  select coalesce(timezone, 'UTC') into v_tz from public.profiles where id = v_uid;
  v_today := (now() at time zone coalesce(v_tz, 'UTC'))::date;

  select count(*) into v_used
  from public.partner_search_attempts
  where user_id = v_uid and local_date = v_today;

  if v_used >= public.daily_search_limit() then
    return jsonb_build_object('ok', false, 'reason', 'daily_limit',
                              'daily_limit', public.daily_search_limit());
  end if;

  update public.partner_matches
  set status = 'declined', declined_by = v_uid, updated_at = now()
  where id = r.id;

  -- Both go back to the pool: the other person did nothing wrong and should not
  -- be dropped out of it because somebody else changed their mind.
  update public.partner_match_requests
  set status = 'waiting', no_match_at = null, updated_at = now()
  where user_id in (r.user_a, r.user_b) and status = 'matched';

  update public.user_challenges
  set partner_state = 'finding'
  where user_id in (r.user_a, r.user_b)
    and status in ('active', 'pending', 'paused')
    and partner_state in ('matched', 'finding');

  insert into public.partner_search_attempts (user_id, local_date)
  values (v_uid, v_today);

  begin
    select value into v_key from public.app_config where key = 'service_role_key';
    select value into v_url from public.app_config where key = 'functions_base_url';
    if v_key is not null and v_url is not null then
      perform net.http_post(
        url := v_url || '/partner-match',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_key
        ),
        body := jsonb_build_object('userId', v_uid::text)
      );
    end if;
  exception when others then
    raise notice 'find_another_match: immediate re-match failed, leaving it to the cron';
  end;

  return jsonb_build_object('ok', true,
                            'searches_left',
                            greatest(public.daily_search_limit() - (v_used + 1), 0));
end;
$$;

grant execute on function public.find_another_match(uuid) to authenticated;

-- ============================================================
-- 8. create_partner_match -- carries the requester through
-- ============================================================
create or replace function public.create_partner_match(
  p_user_a uuid,
  p_user_b uuid,
  p_template uuid,
  p_blurb_a text,
  p_blurb_b text,
  p_requested_by uuid default null
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
    (user_a, user_b, challenge_template_id, blurb_about_a, blurb_about_b,
     status, requested_by)
  values (p_user_a, p_user_b, p_template, p_blurb_a, p_blurb_b,
          'pending', p_requested_by);

  update public.partner_match_requests
  set status = 'matched', no_match_at = null, updated_at = now()
  where user_id in (p_user_a, p_user_b) and status = 'waiting';

  update public.user_challenges
  set partner_state = 'matched'
  where user_id in (p_user_a, p_user_b)
    and status = 'active' and partner_state in ('finding', 'solo');

  return true;
end;
$$;

revoke all on function public.create_partner_match(uuid, uuid, uuid, text, text, uuid)
  from public, anon, authenticated;

-- The 5-argument version would otherwise stay callable and silently write a
-- null requester, so both sides of every match would read as "you asked".
drop function if exists public.create_partner_match(uuid, uuid, uuid, text, text);

notify pgrst, 'reload schema';
