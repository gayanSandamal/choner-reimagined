-- Match found shows whether the other person's photo is confirmed, and, for
-- a pair who will meet in person, the area they share (13 Nov 2026). A pair
-- doing it separately sees no area: location played no part in their match.
-- Additive keys only; an older build ignores them.

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
  v_searching boolean; v_no_match timestamptz; v_expired boolean;
  v_other uuid; v_my_uc uuid; v_their_uc uuid; v_way text; v_area text; v_photo boolean;
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

    -- The last match ran out of time, recently, and nothing has replaced it.
    -- Without this the offer simply vanishes and the radar comes back with no
    -- word about why.
    select exists (
      select 1 from public.partner_matches m
      where m.status = 'expired'
        and (m.user_a = v_uid or m.user_b = v_uid)
        and m.expires_at > now() - interval '24 hours'
        and not exists (
          select 1 from public.partner_matches n
          where (n.user_a = v_uid or n.user_b = v_uid) and n.created_at > m.created_at
        )
    ) into v_expired;

    return jsonb_build_object(
      'matched', false,
      'expired', coalesce(v_searching, false) and v_expired,
      'searching', coalesce(v_searching, false),
      'no_match', coalesce(v_searching, false) and v_no_match is not null,
      'searches_left', v_left,
      'daily_limit', public.daily_search_limit()
    );
  end if;

  if r.user_a = v_uid then
    select full_name, avatar_url into v_name, v_avatar from public.profiles where id = r.user_b;
    v_blurb := r.blurb_about_b; v_mine := r.a_confirmed;
    v_other := r.user_b; v_my_uc := r.user_challenge_a; v_their_uc := r.user_challenge_b;
  else
    select full_name, avatar_url into v_name, v_avatar from public.profiles where id = r.user_a;
    v_blurb := r.blurb_about_a; v_mine := r.b_confirmed;
    v_other := r.user_a; v_my_uc := r.user_challenge_b; v_their_uc := r.user_challenge_a;
  end if;

  -- Match found shows (13 Nov 2026): whether their photo is confirmed, and,
  -- only for a pair who will meet, the area they share. Never their full list
  -- of areas: a stranger learns only what the two of them matched on.
  select coalesce(photo_status = 'photo_confirmed', false) into v_photo from public.profiles where id = v_other;
  select case when 'separate' in (coalesce(m.mode, 'either'), coalesce(t.mode, 'either')) then 'separate' else 'together' end,
         (select l.label from public.locations l
          where l.value in (m.preferred_location, m.preferred_location_2)
            and l.value in (t.preferred_location, t.preferred_location_2)
          order by l.label limit 1)
    into v_way, v_area
  from public.user_challenges m, public.user_challenges t
  where m.id = v_my_uc and t.id = v_their_uc;

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
    'partner_photo_confirmed', coalesce(v_photo, false),
    -- 'together' or 'separate'; null when either challenge is gone.
    'how', v_way,
    -- Only for a together pair who share one: the area's name.
    'shared_area', case when v_way = 'together' then v_area end,
    'searches_left', v_left, 'daily_limit', public.daily_search_limit()
  );
end;
$$;

revoke all on function public.get_my_match(uuid) from public, anon;
grant execute on function public.get_my_match(uuid) to authenticated;
