-- decline_match() and find_another_match() still reset "the most recently
-- updated 'matched' row per user" — the shape the 202609120900 fix needed when
-- a user could only ever hold one request.
--
-- Under the multi-challenge model that is wrong: a user can legitimately hold
-- requests for several challenges, and declining a running match must not
-- reach over and reopen their gym request. Both are now scoped to the two
-- challenges the match itself was made on, which the match now carries.
--
-- This also removes the need for the distinct-on gymnastics: one row per
-- (user, challenge) is exactly what the rescoped unique index guarantees.

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

  -- Both go back into the pool. The other person did nothing wrong and
  -- shouldn't be dropped out of it because somebody else changed their mind —
  -- including the case where they had already confirmed and were waiting.
  update public.partner_match_requests
  set status = 'waiting', no_match_at = null, updated_at = now()
  where user_challenge_id in (r.user_challenge_a, r.user_challenge_b)
    and status = 'matched';

  update public.user_challenges
  set partner_state = 'finding'
  where id in (r.user_challenge_a, r.user_challenge_b)
    and status in ('active', 'pending', 'paused');
end;
$$;

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

  update public.partner_match_requests
  set status = 'waiting', no_match_at = null, updated_at = now()
  where user_challenge_id in (r.user_challenge_a, r.user_challenge_b)
    and status = 'matched';

  update public.user_challenges
  set partner_state = 'finding'
  where id in (r.user_challenge_a, r.user_challenge_b)
    and status in ('active', 'pending', 'paused');

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
