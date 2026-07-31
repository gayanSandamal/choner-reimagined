-- Config storage for the sweep, third attempt — and the one that actually works.
--
-- Vault: vault.create_secret() hangs forever on this project and leaves
--   vault.secrets empty.
-- Database settings: `alter database ... set` cannot run inside a transaction
--   block, and the CLI wraps every statement in one, so it hangs too.
--
-- So: an ordinary table with RLS enabled and NO policies. That denies anon and
-- authenticated outright (RLS with no policy = deny), while security-definer
-- functions and the service role still read it. No secret is committed here —
-- the rows are inserted separately over the service-role API.

create table if not exists public.app_config (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.app_config enable row level security;

-- Deliberately no policies, and no grants to the client roles: this table must
-- never be readable by a signed-in user.
revoke all on public.app_config from anon, authenticated;

create or replace function public.sweep_missed_checkins()
returns integer
language plpgsql
security definer
set search_path = public, net, extensions
as $$
declare
  rec record;
  d date;
  v_local_now timestamp;
  v_deadline_ts timestamp;
  v_notify_ts timestamp;
  v_quiet_start timestamp;
  v_past_tense boolean;
  v_partner_id uuid;
  v_name text;
  v_note text;
  v_title text;
  v_body text;
  v_key text;
  v_url text;
  v_sent integer := 0;
begin
  select value into v_key from public.app_config where key = 'service_role_key';
  select value into v_url from public.app_config where key = 'functions_base_url';

  if v_key is null or v_url is null then
    raise notice 'sweep_missed_checkins: config missing, nothing sent';
    return 0;
  end if;

  for rec in
    select uc.id as challenge_id,
           uc.user_id as owner_id,
           coalesce(p.timezone, 'UTC') as tz,
           coalesce(p.daily_deadline, time '20:00') as deadline,
           coalesce(p.full_name, 'Your partner') as owner_name
    from public.user_challenges uc
    join public.profiles p on p.id = uc.user_id
    where uc.accountability_mode = 'partner'
      and uc.status = 'active'
  loop
    v_local_now := now() at time zone rec.tz;

    foreach d in array array[v_local_now::date, v_local_now::date - 1]
    loop
      if exists (
        select 1 from public.daily_status ds
        where ds.user_challenge_id = rec.challenge_id
          and ds.local_date = d
          and ds.missed_notified_at is not null
      ) then
        continue;
      end if;

      if exists (
        select 1
        from public.task_checkins tc
        join public.challenge_tasks ct on ct.id = tc.challenge_task_id
        where ct.user_challenge_id = rec.challenge_id
          and tc.status = 'completed'
          and ((tc.completed_at at time zone rec.tz)::date = d)
      ) then
        continue;
      end if;

      -- Timestamps, not times: `time '23:00' + interval '3 hours'` wraps to
      -- 02:00 and would fire in the middle of the night.
      v_deadline_ts := d + rec.deadline;
      v_notify_ts := v_deadline_ts + interval '3 hours';
      v_quiet_start := d + time '22:00';

      if v_notify_ts > v_quiet_start then
        if v_deadline_ts < v_quiet_start then
          v_notify_ts := v_quiet_start;
        else
          v_notify_ts := (d + 1) + time '08:00';
        end if;
      end if;

      v_past_tense := v_notify_ts::date > d;

      if v_local_now < v_notify_ts then
        continue;
      end if;

      if v_local_now > v_notify_ts + interval '20 hours' then
        continue;
      end if;

      select case when invited_by = rec.owner_id then accepted_by else invited_by end
        into v_partner_id
      from public.challenge_invites
      where status = 'accepted'
        and (invited_by = rec.owner_id or accepted_by = rec.owner_id)
      order by accepted_at desc nulls last
      limit 1;

      if v_partner_id is null then
        continue;
      end if;

      select late_note into v_note
      from public.daily_status
      where user_challenge_id = rec.challenge_id and local_date = d;

      v_name := split_part(rec.owner_name, ' ', 1);

      v_title := v_name || (case when v_past_tense
                                 then ' didn''t check in yesterday'
                                 else ' hasn''t checked in yet today' end);
      v_body := 'Might be worth a nudge.';
      if v_note is not null and length(trim(v_note)) > 0 then
        v_body := 'They said: "' || trim(v_note) || '"';
      end if;

      perform net.http_post(
        url := v_url || '/send-push',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_key
        ),
        body := jsonb_build_object(
          'userId', v_partner_id,
          'kind', 'partner_activity',
          'title', v_title,
          'body', v_body,
          'route', '/(tabs)/home'
        )
      );

      insert into public.daily_status (user_challenge_id, local_date, missed_notified_at)
      values (rec.challenge_id, d, now())
      on conflict (user_challenge_id, local_date)
      do update set missed_notified_at = now(), updated_at = now();

      v_sent := v_sent + 1;
      exit;
    end loop;
  end loop;

  return v_sent;
end;
$$;

revoke all on function public.sweep_missed_checkins() from public, anon, authenticated;
