-- SCHEMA_CHALLENGES.md §4: one deadline per session, and the sweep that uses it.
--
-- "Missed = no check-in by midnight of the planned day, local time" never said
-- WHOSE local time. In the daily model each person had their own row, so it did
-- not matter. A circle needs both people, and Colombo and London are 4.5 hours
-- apart: for 4.5 hours the same session would be missed for one and still live
-- for the other.
--
-- Decided: the LATER of the two midnights. due_at is worked out when the plan
-- is confirmed (the second person accepts) and stored, so:
--   - the pair has one deadline and the shared circle resolves at one moment;
--   - nobody is marked missed while it is still that day where they are;
--   - changing timezone later cannot move a deadline that was already agreed;
--   - the sweep compares now() > due_at and no longer joins profiles for tz.

alter table public.pair_plans
  add column if not exists due_at timestamptz;

comment on column public.pair_plans.due_at is
  'When this session counts as missed: the later of the two people''s local '
  'midnights after the planned day. Set on confirmation and again if a '
  'confirmed session is moved. NULL until confirmed.';

create index if not exists pair_plans_due_idx
  on public.pair_plans (due_at)
  where status in ('confirmed', 'verified');

-- End of the local day containing p_ts, in zone p_tz. A bad or missing zone
-- falls back to UTC rather than blocking someone from confirming a session.
create or replace function public.local_day_end(p_ts timestamptz, p_tz text)
returns timestamptz
language plpgsql
stable
as $$
begin
  return (date_trunc('day', p_ts at time zone coalesce(nullif(p_tz, ''), 'UTC')) + interval '1 day')
         at time zone coalesce(nullif(p_tz, ''), 'UTC');
exception when others then
  return (date_trunc('day', p_ts at time zone 'UTC') + interval '1 day') at time zone 'UTC';
end;
$$;

create or replace function public.plan_due_at(p_starts_at timestamptz, p_a uuid, p_b uuid)
returns timestamptz
language sql
stable
security definer
set search_path = public
as $$
  select max(public.local_day_end(p_starts_at, pr.timezone))
  from unnest(array[p_a, p_b]) as u(id)
  left join public.profiles pr on pr.id = u.id;
$$;

revoke all on function public.plan_due_at(timestamptz, uuid, uuid) from public, anon, authenticated;

-- A trigger rather than editing every function that can confirm or move a plan
-- (they have been redefined several times): all of them pass through here.
create or replace function public.set_plan_due_at()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'confirmed'
     and new.starts_at is not null
     and (tg_op = 'INSERT'
          or old.status is distinct from 'confirmed'
          or new.starts_at is distinct from old.starts_at) then
    new.due_at := public.plan_due_at(new.starts_at, new.user_a, new.user_b);
  end if;
  return new;
end;
$$;

drop trigger if exists pair_plans_set_due_at on public.pair_plans;
create trigger pair_plans_set_due_at
  before insert or update of status, starts_at on public.pair_plans
  for each row execute function public.set_plan_due_at();

-- Sessions already confirmed get a deadline too.
update public.pair_plans
set due_at = public.plan_due_at(starts_at, user_a, user_b)
where status in ('confirmed', 'verified')
  and starts_at is not null
  and due_at is null;

-- Nothing wrote 'missed' until now. A confirmed or verified session is one that
-- has not been completed by both people, so past its deadline it is a miss.
-- This only marks the circle; the repair debt is a separate rule.
create or replace function public.sweep_missed_sessions()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_n int;
begin
  with m as (
    update public.pair_plans
    set status = 'missed', updated_at = now()
    where status in ('confirmed', 'verified')
      and due_at is not null
      and due_at <= now()
    returning 1
  )
  select count(*) into v_n from m;
  return v_n;
end;
$$;

revoke all on function public.sweep_missed_sessions() from public, anon, authenticated;

do $$
begin
  perform cron.unschedule('choner-missed-sessions');
exception when others then
  null;
end $$;

select cron.schedule(
  'choner-missed-sessions',
  '*/15 * * * *',
  $cron$select public.sweep_missed_sessions()$cron$
);

-- See 202608211600_cron_reload.sql: without this a new job never fires.
select pg_reload_conf();
