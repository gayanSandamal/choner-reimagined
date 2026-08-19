-- Tell your partner when you log today, and make their screen notice.
--
-- Three reported symptoms, one gap. Logging a habit wrote a row to
-- task_checkins and nothing else happened: no notification to the partner, and
-- no event their app could see, so their Home kept showing the old state until
-- they pulled to refresh.
--
-- task_checkins is not in the realtime publication, and adding it would mean
-- the client subscribing to somebody else's rows and relying on RLS to scope
-- the stream. The notifications table is already published, already subscribed,
-- already polled as a backstop, and already invalidates partner-status on
-- arrival -- so routing through it fixes the notification AND the stale UI with
-- one mechanism instead of two.
--
-- send-push both records the in-app row and delivers the push, which is why
-- this calls it rather than inserting into notifications directly.

create or replace function public.notify_partner_on_checkin()
returns trigger
language plpgsql
security definer
set search_path = public, net, extensions
as $$
declare
  v_owner uuid;
  v_partner uuid;
  v_owner_name text;
  v_habit text;
  v_partner_challenge uuid;
  v_partner_done boolean := false;
  v_key text;
  v_url text;
  v_title text;
  v_body text;
begin
  select uc.user_id, uc.partner_user_id,
         coalesce(uc.custom_habit_title, ct.title, 'today''s habit')
    into v_owner, v_partner, v_habit
  from public.user_challenges uc
  left join public.challenge_templates ct on ct.id = uc.challenge_template_id
  where uc.id = new.user_challenge_id;

  -- Solo, or a pairing that has not been confirmed: nobody to tell.
  if v_partner is null then
    return new;
  end if;

  -- One notification per day per challenge. A challenge carries a single task
  -- today, but that is a product decision rather than a guarantee, and nobody
  -- wants three pushes for one morning.
  if exists (
    select 1 from public.task_checkins tc
    where tc.user_challenge_id = new.user_challenge_id
      and tc.id <> new.id
      and tc.status = 'completed'
      and (tc.completed_at at time zone 'utc')::date = (now() at time zone 'utc')::date
  ) then
    return new;
  end if;

  select coalesce(full_name, 'Your partner') into v_owner_name
  from public.profiles where id = v_owner;

  -- Has the partner already logged? If so this completes the day, and the copy
  -- should celebrate rather than nudge.
  select id into v_partner_challenge
  from public.user_challenges
  where user_id = v_partner and status in ('active', 'paused')
  order by started_at desc
  limit 1;

  if v_partner_challenge is not null then
    select exists (
      select 1
      from public.challenge_tasks ct
      join public.task_checkins tc on tc.challenge_task_id = ct.id
      where ct.user_challenge_id = v_partner_challenge
        and tc.status = 'completed'
        and (tc.completed_at at time zone 'utc')::date = (now() at time zone 'utc')::date
    ) into v_partner_done;
  end if;

  if v_partner_done then
    v_title := 'You''re both in today';
    v_body := v_habit || ' — streak alive.';
  else
    v_title := split_part(v_owner_name, ' ', 1) || ' just logged today';
    v_body := v_habit || ' — your turn.';
  end if;

  -- Never fatal. A check-in must not roll back because a notification failed;
  -- the partner's app still catches up on its next poll or focus refetch.
  begin
    select value into v_key from public.app_config where key = 'service_role_key';
    select value into v_url from public.app_config where key = 'functions_base_url';

    if v_key is not null and v_url is not null then
      perform net.http_post(
        url := v_url || '/send-push',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_key
        ),
        body := jsonb_build_object(
          'userId', v_partner,
          'kind', 'partner_activity',
          'title', v_title,
          'body', v_body,
          'route', '/(tabs)/home'
        )
      );
    else
      raise notice 'notify_partner_on_checkin: app_config missing, nothing sent';
    end if;
  exception when others then
    raise notice 'notify_partner_on_checkin: notification failed, check-in kept';
  end;

  return new;
end;
$$;

drop trigger if exists task_checkins_notify_partner on public.task_checkins;

create trigger task_checkins_notify_partner
  after insert on public.task_checkins
  for each row
  when (new.status = 'completed')
  execute function public.notify_partner_on_checkin();

notify pgrst, 'reload schema';
