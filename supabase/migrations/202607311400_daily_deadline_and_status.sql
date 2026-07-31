-- Feature 3, part 1: the deadline a day is measured against, and the per-day
-- record the missed-day sweep reads and writes.
--
-- Timezone is not optional here. A deadline stored without one fires at the
-- wrong local hour for anyone outside UTC, and the whole feature is about
-- firing at a humane, actionable moment.
--
-- Default deadline is 20:00 rather than a later hour on purpose: with the
-- spec's 3h grace, a 21:00 deadline would notify the partner at midnight —
-- both unkind and useless, since there is no longer any day left to act on.

alter table public.profiles
  add column if not exists timezone text not null default 'UTC';

alter table public.profiles
  add column if not exists daily_deadline time not null default '20:00';

-- ============================================================
-- daily_status — one row per challenge per local day
-- ============================================================
-- Carries two things that have nowhere else to live:
--   * late_note: the "running late, doing it tonight" message. task_checkins.note
--     only exists ON a check-in, and a missed day by definition has none.
--   * missed_notified_at: once-only dedupe. The sweep runs hourly, so without
--     this the partner would be nudged every hour until midnight.
create table if not exists public.daily_status (
  id uuid primary key default gen_random_uuid(),
  user_challenge_id uuid not null references public.user_challenges(id) on delete cascade,
  local_date date not null,
  late_note text,
  missed_notified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_challenge_id, local_date)
);

create index if not exists daily_status_challenge_date_idx
  on public.daily_status (user_challenge_id, local_date);

alter table public.daily_status enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'daily_status' and policyname = 'daily_status_own_select') then
    create policy daily_status_own_select on public.daily_status for select to authenticated using (
      exists (
        select 1 from public.user_challenges uc
        where uc.id = daily_status.user_challenge_id
          and (
            uc.user_id = auth.uid()
            -- The partner reads the late note; that is the whole point of it.
            or public.is_partner_of(auth.uid(), uc.user_id)
          )
      )
    );
  end if;

  -- Writes stay owner-only: only you can explain your own day.
  if not exists (select 1 from pg_policies where tablename = 'daily_status' and policyname = 'daily_status_own_insert') then
    create policy daily_status_own_insert on public.daily_status for insert to authenticated with check (
      exists (
        select 1 from public.user_challenges uc
        where uc.id = daily_status.user_challenge_id and uc.user_id = auth.uid()
      )
    );
  end if;

  if not exists (select 1 from pg_policies where tablename = 'daily_status' and policyname = 'daily_status_own_update') then
    create policy daily_status_own_update on public.daily_status for update to authenticated using (
      exists (
        select 1 from public.user_challenges uc
        where uc.id = daily_status.user_challenge_id and uc.user_id = auth.uid()
      )
    );
  end if;
end $$;

-- ============================================================
-- set_late_note — "running late, doing it tonight"
-- ============================================================
-- Resolves the caller's own local date from their timezone so the client never
-- has to compute it (and cannot disagree with the sweep about which day it is).
create or replace function public.set_late_note(p_user_challenge_id uuid, p_note text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_tz text;
  v_local_date date;
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
  v_local_date := ((now() at time zone coalesce(v_tz, 'UTC'))::date);

  insert into public.daily_status (user_challenge_id, local_date, late_note)
  values (p_user_challenge_id, v_local_date, nullif(trim(p_note), ''))
  on conflict (user_challenge_id, local_date)
  do update set late_note = nullif(trim(p_note), ''), updated_at = now();
end;
$$;

grant execute on function public.set_late_note(uuid, text) to authenticated;
