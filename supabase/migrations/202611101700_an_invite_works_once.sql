-- Invite links work once (10 Nov 2026, found from Dinesh's iPhone with
-- WALW89, an invite he had already accepted on 8 Nov).
--
-- accept_challenge_invite() had three gaps:
--   1. The person who already accepted could accept again. It re-ran the
--      join, re-pointed their challenge at the inviter's, and the app said
--      "You're in!" a second time.
--   2. It never looked at expires_at. preview_invite() did, so the app was
--      warned, but the server let an expired invite through.
--   3. Its only partner check, has_other_active_partner(), leaves the inviter
--      out, so someone already paired with the inviter sailed through. It now
--      refuses over ANY active partnership, and over a match offer that is
--      still waiting on an answer.
-- Each refusal carries a hint the app reads to show the right screen.
--
-- preview_invite() is brought in line, so the app can say which of these it
-- is before anything is attempted.

create or replace function public.accept_challenge_invite(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public, net, extensions
as $$
declare
  v_invite_id uuid;
  v_user_challenge_id uuid;
  v_invited_by uuid;
  v_status text;
  v_accepted_by uuid;
  v_template_id uuid;
  v_custom_title text;
  v_my_challenge_id uuid;
  v_uid uuid := auth.uid();
  v_already_accepted boolean := false;
  v_expires_at timestamptz;
  v_joiner_name text;
  v_key text;
  v_url text;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select id, user_challenge_id, invited_by, status, accepted_by, expires_at
    into v_invite_id, v_user_challenge_id, v_invited_by, v_status, v_accepted_by, v_expires_at
  from public.challenge_invites
  where token = p_token
  limit 1
  for update;

  if v_invite_id is null then
    raise exception 'invite not found';
  end if;
  if v_invited_by = v_uid then
    raise exception 'you cannot accept your own invite';
  end if;

  -- One use, once (10 Nov 2026). Re-opening a link you already used used to
  -- run the whole join again and say "You're in!" a second time, re-pointing
  -- your challenge at the inviter's on the way. Now it changes nothing.
  if v_status = 'accepted' and v_accepted_by = v_uid then
    raise exception 'You already joined this challenge. This invite has been used.'
      using errcode = 'P0001', hint = 'invite_already_joined';
  elsif v_status <> 'pending' then
    raise exception 'This invite has already been used.'
      using errcode = 'P0001', hint = 'invite_used';
  end if;
  if v_expires_at is not null and now() > v_expires_at then
    raise exception 'This invite has expired. Ask them to send a new one.'
      using errcode = 'P0001', hint = 'invite_expired';
  end if;

  -- Never over an existing partnership, with anyone, the inviter included.
  -- has_other_active_partner() leaves the inviter out on purpose, which is
  -- exactly how a second invite from your own partner re-ran the join.
  if exists (select 1 from public.partnerships p
             where p.state = 'active' and v_uid in (p.user_a, p.user_b)) then
    raise exception 'You already have a partner. End that match before joining another.'
      using errcode = 'P0001', hint = 'invite_you_partnered';
  end if;
  -- Nor over a match offer still waiting on an answer.
  if exists (select 1 from public.partner_matches m
             where m.status = 'pending' and v_uid in (m.user_a, m.user_b)) then
    raise exception 'You have a match waiting for your answer. Answer it on Find first.'
      using errcode = 'P0001', hint = 'invite_match_waiting';
  end if;

  update public.challenge_invites
  set status = 'accepted', accepted_by = v_uid, accepted_at = now()
  where id = v_invite_id;

  -- The inviter's challenge, whether or not the invite carried its id.
  if v_user_challenge_id is null then
    select id into v_user_challenge_id
    from public.user_challenges
    where user_id = v_invited_by and status in ('active', 'pending', 'paused')
    order by started_at desc
    limit 1;
  end if;

  select challenge_template_id, custom_habit_title
    into v_template_id, v_custom_title
  from public.user_challenges where id = v_user_challenge_id;

  -- The accepter joins the SAME habit, custom wording included.
  select public.ensure_user_challenge(v_uid, v_template_id, v_custom_title)
    into v_my_challenge_id;

  update public.user_challenges
  set challenge_template_id = v_template_id,
      custom_habit_title = v_custom_title,
      partner_user_id = v_invited_by,
      partner_state = 'partnered',
      status = 'active'
  where id = v_my_challenge_id;

  update public.challenge_tasks
  set title = coalesce(
    v_custom_title,
    (select title from public.challenge_templates where id = v_template_id),
    title)
  where user_challenge_id = v_my_challenge_id;

  update public.user_challenges
  set partner_user_id = v_uid,
      partner_state = 'partnered',
      status = 'active'
  where id = v_user_challenge_id;

  -- Neither side is still hunting.
  update public.partner_match_requests
  set status = 'cancelled', updated_at = now()
  where user_id in (v_uid, v_invited_by) and status = 'waiting';

  if not v_already_accepted then
    begin
      select value into v_key from public.app_config where key = 'service_role_key';
      select value into v_url from public.app_config where key = 'functions_base_url';
      select coalesce(full_name, 'Your partner') into v_joiner_name
      from public.profiles where id = v_uid;

      if v_key is not null and v_url is not null then
        perform net.http_post(
          url := v_url || '/send-push',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || v_key
          ),
          body := jsonb_build_object(
            'userId', v_invited_by,
            'kind', 'partner_activity',
            'title', split_part(v_joiner_name, ' ', 1) || ' joined your challenge',
            'body', 'You''re both in — your challenge starts now.',
            'route', '/(tabs)/home'
          )
        );
      end if;
    exception when others then
      raise notice 'accept_challenge_invite: join notification failed, pairing kept';
    end;
  end if;

  return v_user_challenge_id;
end;
$$;

create or replace function public.preview_invite(p_code text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_input text := public.normalize_invite_code(p_code);
  i record;
  v_their_uc uuid;
  v_their_template uuid;
  v_their_custom text;
  v_activity text;
  mine record;
  v_replaces text;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  if v_input is null then
    return jsonb_build_object('found', false);
  end if;

  select * into i from public.challenge_invites
  where code = v_input or token = p_code
  limit 1;
  if i.id is null then
    return jsonb_build_object('found', false);
  end if;

  -- The inviter's challenge, the same way accept_challenge_invite() finds it.
  v_their_uc := i.user_challenge_id;
  if v_their_uc is null then
    select id into v_their_uc from public.user_challenges
    where user_id = i.invited_by and status in ('active', 'pending', 'paused')
    order by started_at desc limit 1;
  end if;
  select uc.challenge_template_id, nullif(btrim(uc.custom_habit_title), '')
    into v_their_template, v_their_custom
  from public.user_challenges uc where uc.id = v_their_uc;
  select coalesce(v_their_custom, t.title) into v_activity
  from public.challenge_templates t where t.id = v_their_template;

  -- My current challenge, and whether accepting would change what it is.
  select uc.id, uc.challenge_template_id, nullif(btrim(uc.custom_habit_title), '') as custom,
         coalesce(nullif(btrim(uc.custom_habit_title), ''), t.title) as title
    into mine
  from public.user_challenges uc
  left join public.challenge_templates t on t.id = uc.challenge_template_id
  where uc.user_id = v_uid and uc.status in ('active', 'pending', 'paused')
  order by uc.started_at desc limit 1;

  if mine.id is not null
     and (mine.challenge_template_id is distinct from v_their_template
          or mine.custom is distinct from v_their_custom) then
    v_replaces := mine.title;
  end if;

  return jsonb_build_object(
    'found', true,
    'own', i.invited_by = v_uid,
    'status', i.status,
    'mine', i.status = 'accepted' and i.accepted_by = v_uid,
    'expired', i.status = 'pending' and i.expires_at is not null and now() > i.expires_at,
    'expires_at', i.expires_at,
    'inviter_first_name', (select split_part(coalesce(full_name, 'Your friend'), ' ', 1)
                           from public.profiles where id = i.invited_by),
    'activity', v_activity,
    -- The name of the challenge that would be REPLACED, or null when accepting
    -- changes nothing about what the person is doing.
    'replaces', v_replaces,
    -- 'expired' is now true for any invite past its time that was never
    -- used, and 'used' for one somebody else accepted.
    'used', i.status = 'accepted' and i.accepted_by is distinct from v_uid,
    'blocked', case
      when exists (select 1 from public.partnerships p
                   where p.state = 'active' and v_uid in (p.user_a, p.user_b)) then 'you_partnered'
      when exists (select 1 from public.partner_matches m
                   where m.status = 'pending' and v_uid in (m.user_a, m.user_b)) then 'match_waiting'
      when public.has_other_active_partner(i.invited_by, v_uid) then 'they_partnered'
      else null end
  );
end;
$$;

revoke all on function public.accept_challenge_invite(text) from public, anon;
grant execute on function public.accept_challenge_invite(text) to authenticated;
revoke all on function public.preview_invite(text) from public, anon;
grant execute on function public.preview_invite(text) to authenticated;
