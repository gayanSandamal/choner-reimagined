-- Adds a place to store *why* a day was missed. reason_prompted_at is tracked
-- separately from reason so a dismiss-without-answering still suppresses the
-- prompt on next open ("one-time dismissible" - the prompt must not reappear
-- just because nobody answered it).
alter table public.daily_status
  add column if not exists reason text,
  add column if not exists reason_prompted_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'daily_status_reason_check') then
    alter table public.daily_status
      add constraint daily_status_reason_check
      check (reason is null or reason in (
        'too_busy', 'too_tired', 'forgot', 'didnt_feel_like_it', 'something_came_up'
      ));
  end if;
end $$;

-- ============================================================
-- get_yesterday_status -- was yesterday missed, and has it been asked about
-- ============================================================
--
-- Deliberately derives "missed" from checkin absence directly rather than from
-- daily_status.missed_notified_at: sweep_missed_checkins() only loops over
-- partner_state = 'partnered' rows, so a solo user never gets a
-- missed_notified_at row written at all, and would otherwise never see this
-- prompt.
create or replace function public.get_yesterday_status(p_user_challenge_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_tz text;
  v_local_yesterday date;
  v_started_at timestamptz;
  v_missed boolean;
  v_reason text;
  v_prompted_at timestamptz;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  if not exists (
    select 1 from public.user_challenges
    where id = p_user_challenge_id and user_id = v_uid
  ) then
    raise exception 'not your challenge';
  end if;

  select coalesce(timezone, 'UTC') into v_tz from public.profiles where id = v_uid;
  v_local_yesterday := (now() at time zone coalesce(v_tz, 'UTC'))::date - 1;

  select started_at into v_started_at from public.user_challenges where id = p_user_challenge_id;

  -- The challenge didn't exist yet yesterday — nothing to have missed.
  if v_started_at is not null
     and v_local_yesterday < (v_started_at at time zone coalesce(v_tz, 'UTC'))::date then
    return jsonb_build_object(
      'local_date', v_local_yesterday, 'missed', false, 'reason', null, 'needs_prompt', false
    );
  end if;

  v_missed := not exists (
    select 1 from public.task_checkins tc
    where tc.user_challenge_id = p_user_challenge_id
      and tc.status = 'completed'
      and (tc.completed_at at time zone coalesce(v_tz, 'UTC'))::date = v_local_yesterday
  );

  select reason, reason_prompted_at into v_reason, v_prompted_at
  from public.daily_status
  where user_challenge_id = p_user_challenge_id and local_date = v_local_yesterday;

  return jsonb_build_object(
    'local_date', v_local_yesterday,
    'missed', v_missed,
    'reason', v_reason,
    'needs_prompt', v_missed and v_prompted_at is null
  );
end;
$$;

grant execute on function public.get_yesterday_status(uuid) to authenticated;

-- ============================================================
-- set_miss_reason -- capture the answer, or a dismiss (p_reason = null)
-- ============================================================
create or replace function public.set_miss_reason(
  p_user_challenge_id uuid,
  p_local_date date,
  p_reason text default null
)
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

  if not exists (
    select 1 from public.user_challenges
    where id = p_user_challenge_id and user_id = v_uid
  ) then
    raise exception 'not your challenge';
  end if;

  if p_reason is not null and p_reason not in (
    'too_busy', 'too_tired', 'forgot', 'didnt_feel_like_it', 'something_came_up'
  ) then
    raise exception 'invalid reason';
  end if;

  insert into public.daily_status (user_challenge_id, local_date, reason, reason_prompted_at)
  values (p_user_challenge_id, p_local_date, p_reason, now())
  on conflict (user_challenge_id, local_date)
  do update set
    reason = coalesce(p_reason, public.daily_status.reason),
    reason_prompted_at = now(),
    updated_at = now();
end;
$$;

grant execute on function public.set_miss_reason(uuid, date, text) to authenticated;
