-- The daily reminders stop. A session reminder takes their place.
--
-- Two cron jobs belonged to the daily model and were still running after the
-- app stopped having a daily anything:
--
--   choner-daily-reminders   "Running: log it before 8:00pm", every evening,
--                            about a button that no longer exists
--   choner-missed-checkins   told a partner you "didn't check in yesterday"
--
-- Home was the last screen with a daily check-in. It goes in the same release
-- as this migration, so from here on those pushes would be about nothing. Both
-- jobs are unscheduled. Their functions are left in place: dropping them would
-- break a `db reset` that replays the migrations which schedule them.
--
-- What replaces them is a reminder about the thing the product IS now: a
-- session two people agreed. Sent once per person, in the two hours before it
-- starts. In separate mode each person can have their own time, so the clock
-- is their own planned_at where there is one.
--
-- Through notify_user(), so it is in-app only during the recipient's quiet
-- hours. Kind 'session_reminder', which send-push maps to the same preference
-- the daily reminder used (streak_alerts), so someone who turned reminders off
-- does not get these either.

alter table public.pair_plan_members
  add column if not exists reminded_at timestamptz;

comment on column public.pair_plan_members.reminded_at is
  'When this person was reminded about this session. Once per person per '
  'session; cleared if the session is moved.';

create or replace function public.sweep_session_reminders()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_n int := 0;
  v_noun text;
  v_time text;
begin
  for r in
    select m.plan_id, m.user_id, p.activity_key,
           coalesce(m.planned_at, p.starts_at) as at,
           coalesce(pr.timezone, 'UTC') as tz,
           split_part(coalesce(other.full_name, 'your partner'), ' ', 1) as partner
    from public.pair_plan_members m
    join public.pair_plans p on p.id = m.plan_id
    join public.profiles pr on pr.id = m.user_id
    left join public.profiles other
      on other.id = case when p.user_a = m.user_id then p.user_b else p.user_a end
    where p.status = 'confirmed'
      and m.reminded_at is null
      and coalesce(m.planned_at, p.starts_at) > now()
      and coalesce(m.planned_at, p.starts_at) <= now() + interval '2 hours'
    for update of m skip locked
  loop
    update public.pair_plan_members set reminded_at = now()
    where plan_id = r.plan_id and user_id = r.user_id;

    v_noun := case r.activity_key
      when 'running' then 'run' when 'jogging' then 'jog' when 'walking' then 'walk'
      when 'cycling' then 'ride' when 'yoga' then 'yoga session' when 'home_workouts' then 'workout'
      else 'session' end;
    begin
      v_time := btrim(to_char(r.at at time zone r.tz, 'FMHH12:MI am'));
    exception when others then
      v_time := btrim(to_char(r.at at time zone 'UTC', 'FMHH12:MI am'));
    end;

    perform public.notify_user(
      r.user_id, 'session_reminder',
      'Your ' || v_noun || ' with ' || r.partner,
      'It starts at ' || v_time || '. ' || r.partner || ' is counting on you.',
      '/(tabs)/challenges');
    v_n := v_n + 1;
  end loop;
  return v_n;
end;
$$;

revoke all on function public.sweep_session_reminders() from public, anon, authenticated;

-- A moved session is a new time to be reminded about.
create or replace function public.clear_session_reminder_on_move()
returns trigger
language plpgsql
as $$
begin
  if new.starts_at is distinct from old.starts_at then
    update public.pair_plan_members set reminded_at = null where plan_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists pair_plans_clear_reminder on public.pair_plans;
create trigger pair_plans_clear_reminder
  after update of starts_at on public.pair_plans
  for each row execute function public.clear_session_reminder_on_move();

do $$
begin
  perform cron.unschedule('choner-daily-reminders');
exception when others then null;
end $$;

do $$
begin
  perform cron.unschedule('choner-missed-checkins');
exception when others then null;
end $$;

do $$
begin
  perform cron.unschedule('choner-session-reminders');
exception when others then null;
end $$;

select cron.schedule(
  'choner-session-reminders',
  '*/15 * * * *',
  $cron$select public.sweep_session_reminders()$cron$
);

-- See 202608211600_cron_reload.sql: without this a new job never fires.
select pg_reload_conf();
