-- The Find/Challenges match card ("We found your partner") showed only a
-- name, no photo - add the partner's avatar_url alongside the first name
-- lookup that already exists here.
create or replace function public.get_my_match()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  r record;
  v_other uuid;
  v_blurb text;
  v_mine boolean;
  v_name text;
  v_avatar text;
  v_title text;
  v_days int;
  v_tz text;
  v_today date;
  v_used int;
  v_left int;
  v_no_match timestamptz;
  v_searching boolean;
begin
  if v_uid is null then
    return jsonb_build_object('matched', false);
  end if;

  select coalesce(timezone, 'UTC') into v_tz from public.profiles where id = v_uid;
  v_today := (now() at time zone coalesce(v_tz, 'UTC'))::date;

  select count(*) into v_used
  from public.partner_search_attempts
  where user_id = v_uid and local_date = v_today;
  v_left := greatest(public.daily_search_limit() - v_used, 0);

  select (status = 'waiting'), no_match_at into v_searching, v_no_match
  from public.partner_match_requests
  where user_id = v_uid
  order by created_at desc
  limit 1;

  select * into r
  from public.partner_matches
  where status = 'pending' and (user_a = v_uid or user_b = v_uid)
  order by created_at desc
  limit 1;

  if r.id is null then
    return jsonb_build_object(
      'matched', false,
      'searching', coalesce(v_searching, false),
      -- Only meaningful while still waiting: a stale no_match_at on somebody who
      -- has since stopped looking would show them a dead end they left behind.
      'no_match', coalesce(v_searching, false) and v_no_match is not null,
      'searches_left', v_left,
      'daily_limit', public.daily_search_limit()
    );
  end if;

  if r.user_a = v_uid then
    v_other := r.user_b; v_blurb := r.blurb_about_b; v_mine := r.a_confirmed;
  else
    v_other := r.user_a; v_blurb := r.blurb_about_a; v_mine := r.b_confirmed;
  end if;

  select split_part(coalesce(full_name, 'Your partner'), ' ', 1), avatar_url
  into v_name, v_avatar
  from public.profiles where id = v_other;

  select title, duration_days into v_title, v_days
  from public.challenge_templates where id = r.challenge_template_id;

  return jsonb_build_object(
    'matched', true,
    'match_id', r.id,
    'partner_first_name', v_name,
    'partner_avatar_url', v_avatar,
    'blurb', v_blurb,
    'habit', v_title,
    'duration_days', v_days,
    'i_confirmed', v_mine,
    'they_confirmed', case when r.user_a = v_uid then r.b_confirmed else r.a_confirmed end,
    -- Null requested_by means the sweep paired two people who were both already
    -- waiting; neither asked for this one specifically, so both are treated as
    -- requesters and get the same wording.
    'i_requested', r.requested_by is null or r.requested_by = v_uid,
    'searches_left', v_left,
    'daily_limit', public.daily_search_limit()
  );
end;
$$;
