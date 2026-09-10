-- Two things fixed together because they're the same code path:
--
-- 1. today_photos regressed to nothing. 202607311200_partner_checkin_photos.sql
--    added it so PartnerProof.tsx had something to render, but both later
--    rewrites of this function (202608131600's partner-model switch and
--    202608211300's timezone fix) were built on a copy of the function that
--    predated the photos feature, and silently dropped the field entirely.
--    Since then get_partner_status has never returned today_photos, so
--    PartnerProof has rendered nothing in production - `photos.length === 0`
--    on every call. This restores it on top of the CURRENT (post-timezone-fix)
--    version, using the already-computed local v_partner_today rather than the
--    old UTC comparison.
-- 2. Adds tc.id (needed so the client can call mark_checkin_photo_viewed) and
--    excludes photos already marked viewed, so a viewed photo simply stops
--    being handed to the partner at all - that exclusion IS the "disappears
--    once viewed" behavior; the storage bytes themselves are removed shortly
--    after by the cleanup sweep, which is a hygiene step the UI never has to
--    wait on.
create or replace function public.get_partner_status(p_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_partner_id uuid;
  v_state text;
  v_name text;
  v_avatar text;
  v_challenge_id uuid;
  v_partner_tz text;
  v_partner_today date;
  v_my_tz text;
  v_my_today date;
  v_nudged boolean := false;
  v_total int := 0;
  v_done int := 0;
  v_photos jsonb := '[]'::jsonb;
begin
  if auth.uid() is not null and auth.uid() <> p_user_id then
    raise exception 'not your status';
  end if;

  select partner_user_id, partner_state into v_partner_id, v_state
  from public.user_challenges
  where user_id = p_user_id and status in ('active', 'pending', 'paused')
  order by started_at desc
  limit 1;

  if v_partner_id is null or v_state <> 'partnered' then
    return jsonb_build_object('linked', false, 'partner_state', coalesce(v_state, 'solo'));
  end if;

  select full_name, avatar_url into v_name, v_avatar
  from public.profiles where id = v_partner_id;

  select coalesce(timezone, 'UTC') into v_partner_tz
  from public.profiles where id = v_partner_id;
  select coalesce(timezone, 'UTC') into v_my_tz
  from public.profiles where id = p_user_id;

  -- Their day for their progress, my day for my rate limit. These are genuinely
  -- different questions and can fall on different dates.
  v_partner_today := (now() at time zone coalesce(v_partner_tz, 'UTC'))::date;
  v_my_today := (now() at time zone coalesce(v_my_tz, 'UTC'))::date;

  select id into v_challenge_id
  from public.user_challenges
  where user_id = v_partner_id and status in ('active', 'paused')
  order by started_at desc
  limit 1;

  if v_challenge_id is not null then
    select count(*) into v_total
    from public.challenge_tasks where user_challenge_id = v_challenge_id;

    select count(distinct ct.id) into v_done
    from public.challenge_tasks ct
    join public.task_checkins tc on tc.challenge_task_id = ct.id
    where ct.user_challenge_id = v_challenge_id
      and tc.status = 'completed'
      and (tc.completed_at at time zone coalesce(v_partner_tz, 'UTC'))::date = v_partner_today;

    -- Today's proof photos, if this habit is photo-verified at all. Already
    -- viewed ones are excluded outright, not just hidden client-side.
    select coalesce(
      jsonb_agg(jsonb_build_object('id', tc.id, 'task_title', ct.title, 'photo_path', tc.photo_path)),
      '[]'::jsonb
    )
    into v_photos
    from public.challenge_tasks ct
    join public.task_checkins tc on tc.challenge_task_id = ct.id
    where ct.user_challenge_id = v_challenge_id
      and tc.status = 'completed'
      and tc.photo_path is not null
      and tc.photo_viewed_at is null
      and (tc.completed_at at time zone coalesce(v_partner_tz, 'UTC'))::date = v_partner_today;
  end if;

  select exists (
    select 1 from public.partner_nudges
    where from_user_id = p_user_id
      and to_user_id = v_partner_id
      and local_date = v_my_today
  ) into v_nudged;

  return jsonb_build_object(
    'linked', true,
    'partner_state', v_state,
    'partner_id', v_partner_id,
    'name', v_name,
    'avatar_url', v_avatar,
    'total_tasks', v_total,
    'completed_today', v_done,
    'checked_in_today', v_done > 0,
    'nudged_today', v_nudged,
    'today_photos', v_photos
  );
end;
$$;
