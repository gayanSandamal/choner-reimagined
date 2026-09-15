-- find_another_match() and decline_match() both reset a user's
-- partner_match_requests row to 'waiting' with an unscoped
-- `where user_id in (...) and status = 'matched'`. confirm_match() never
-- transitions a request row away from 'matched' once a match is confirmed,
-- so a user who has been through more than one match cycle can accumulate
-- several stale 'matched' rows. A single UPDATE flipping more than one of
-- them to 'waiting' at once collides with the partial unique index
-- (partner_match_requests_one_waiting enforces at most one 'waiting' row per
-- user) the moment the second row is touched — "duplicate key value violates
-- unique constraint" on a plain tap of "Find someone else".
--
-- Fix: scope the UPDATE to only the single most-recently-updated 'matched'
-- row per user (the one actually tied to the match just declined), never a
-- blanket sweep across history.

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
  -- be dropped out of it because somebody else changed their mind. Scoped to
  -- the single most-recent 'matched' row per user so a stray older one never
  -- collides with it.
  update public.partner_match_requests pmr
  set status = 'waiting', no_match_at = null, updated_at = now()
  where pmr.id in (
    select id from (
      select distinct on (user_id) id
      from public.partner_match_requests
      where user_id in (r.user_a, r.user_b) and status = 'matched'
      order by user_id, updated_at desc
    ) latest
  );

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
  -- Same single-row scoping as find_another_match, same reason.
  update public.partner_match_requests pmr
  set status = 'waiting', updated_at = now()
  where pmr.id in (
    select id from (
      select distinct on (user_id) id
      from public.partner_match_requests
      where user_id in (r.user_a, r.user_b) and status = 'matched'
      order by user_id, updated_at desc
    ) latest
  );

  update public.user_challenges
  set partner_state = 'finding'
  where user_id in (r.user_a, r.user_b)
    and status in ('active', 'pending', 'paused')
    and partner_state in ('matched', 'finding');
end;
$$;

-- One-time cleanup: cancel every 'matched' request row except the most
-- recently updated one per user, so already-stuck accounts (this bug was
-- live before this fix, so some exist right now) recover immediately rather
-- than waiting for their next match cycle to trip over the same rows.
update public.partner_match_requests pmr
set status = 'cancelled', updated_at = now()
where pmr.status = 'matched'
  and pmr.id not in (
    select distinct on (user_id) id
    from public.partner_match_requests
    where status = 'matched'
    order by user_id, updated_at desc
  );
