-- SCHEMA_CHALLENGES.md §4: both people see the same 24 hour countdown.
--
-- 202609301300 added partner_matches.expires_at and the sweep that expires a
-- pending match, but nothing handed the deadline to the client, so the app had
-- no number to count down to. This re-issues get_my_match() (latest body:
-- 202609182000) with one added key, `expires_at`, and nothing else changed.
--
-- It is the row's own deadline, not now() + something worked out here, so the
-- two people cannot be shown different numbers.

create or replace function public.get_my_match(p_user_challenge_id uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  r record;
  v_name text; v_avatar text; v_blurb text; v_title text; v_days int;
  v_mine boolean; v_tz text; v_today date; v_used int; v_left int;
  v_searching boolean; v_no_match timestamptz;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select coalesce(timezone, 'UTC') into v_tz from public.profiles where id = v_uid;
  v_today := (now() at time zone coalesce(v_tz, 'UTC'))::date;
  select count(*) into v_used from public.partner_search_attempts
  where user_id = v_uid and local_date = v_today;
  v_left := greatest(public.daily_search_limit() - v_used, 0);

  select * into r from public.partner_matches
  where status = 'pending'
    and (user_a = v_uid or user_b = v_uid)
    and (p_user_challenge_id is null
         or user_challenge_a = p_user_challenge_id
         or user_challenge_b = p_user_challenge_id)
  order by created_at desc limit 1;

  if r.id is null then
    select (status = 'waiting'), no_match_at into v_searching, v_no_match
    from public.partner_match_requests
    where user_id = v_uid
      and (p_user_challenge_id is null or user_challenge_id = p_user_challenge_id)
    order by created_at desc limit 1;

    return jsonb_build_object(
      'matched', false,
      'searching', coalesce(v_searching, false),
      'no_match', coalesce(v_searching, false) and v_no_match is not null,
      'searches_left', v_left,
      'daily_limit', public.daily_search_limit()
    );
  end if;

  if r.user_a = v_uid then
    select full_name, avatar_url into v_name, v_avatar from public.profiles where id = r.user_b;
    v_blurb := r.blurb_about_b; v_mine := r.a_confirmed;
  else
    select full_name, avatar_url into v_name, v_avatar from public.profiles where id = r.user_a;
    v_blurb := r.blurb_about_a; v_mine := r.b_confirmed;
  end if;

  select title, duration_days into v_title, v_days
  from public.challenge_templates where id = r.challenge_template_id;

  return jsonb_build_object(
    'matched', true, 'match_id', r.id,
    'partner_first_name', split_part(coalesce(v_name, 'Someone'), ' ', 1),
    'partner_avatar_url', v_avatar,
    'blurb', v_blurb, 'habit', v_title, 'duration_days', v_days,
    'i_confirmed', v_mine,
    'they_confirmed', case when r.user_a = v_uid then r.b_confirmed else r.a_confirmed end,
    'i_requested', r.requested_by is null or r.requested_by = v_uid,
    -- One clock, started when the match was created, the same for both people.
    'expires_at', r.expires_at,
    'searches_left', v_left, 'daily_limit', public.daily_search_limit()
  );
end;
$$;

revoke all on function public.get_my_match(uuid) from public, anon;
grant execute on function public.get_my_match(uuid) to authenticated;
