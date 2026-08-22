-- Match people the moment they ask, instead of only on the next cron tick.
--
-- The cron alone left a real gap: it runs every five minutes, so somebody who
-- tapped "Find a partner" just after a tick waited the best part of five
-- minutes staring at a screen that said nothing was happening. Measured on a
-- real account -- joined at 18:04:18, matched at 18:07:01 -- and the wait read
-- as broken rather than as pending, which is the whole problem.
--
-- So the request itself now kicks off a matching run for that one person. This
-- is the user asking, and acting on their request immediately is the most
-- consent-respecting version of this: nobody is matched who did not just press
-- the button. The cron stays as the follow-up for anyone who had no viable
-- partner at the moment they asked -- someone doing a habit nobody else has
-- picked yet gets paired when a partner eventually turns up, without having to
-- ask again.
--
-- Deliberately not fatal. net.http_post is fire-and-forget and a failure here
-- must not stop the user joining the pool: the cron will pick them up either
-- way, so the worst case is the old five-minute wait rather than a lost request.

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

  -- Try to pair them now. Scoped to this user, so the run is small and cannot
  -- disturb anybody who did not just ask for it.
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

-- pg_cron caches its job list and will not notice migrations that touch
-- scheduling unless the launcher is SIGHUPed. Harmless here, and keeps the
-- habit in place -- see 202608211600.
select pg_reload_conf();

notify pgrst, 'reload schema';
