-- SCHEMA_CHALLENGES.md §2 and §8 item 1: block outright if already partnered,
-- and say so in words.
--
-- 202609301500 made one-active-partnership-per-person a hard rule, enforced by
-- a trigger on partnerships. That is the backstop and it stays. But it fires
-- deep inside the write to user_challenges, so someone already partnered who
-- entered an invite code or accepted a match got a raw database error
-- ("already in an active partnership", sqlstate 23505) with no idea which of
-- the two people it was about or what to do next.
--
-- This puts the check where the person is, in the two functions the app
-- calls, with a message it can show as it stands:
--
--   accept_invite_by_code()  the only acceptance path the app uses now
--   confirm_match()          re-issued from 202609231600 with the guard added
--                            and nothing else changed
--
-- Only the "already partnered" half of §8 item 1 is settled here. What happens
-- to an invitee who has an active challenge but NO partner (end theirs,
-- replace it, or ask) is still open and is not touched.

-- True when p_user has an active partnership with anyone OTHER than p_except.
-- The exception is what keeps re-opening your own accepted invite idempotent:
-- being partnered with the person who invited you is the expected outcome,
-- not a conflict.
create or replace function public.has_other_active_partner(p_user uuid, p_except uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.partnerships p
    where p.state = 'active'
      and (p.user_a = p_user or p.user_b = p_user)
      and (case when p.user_a = p_user then p.user_b else p.user_a end)
          is distinct from p_except
  );
$$;

revoke all on function public.has_other_active_partner(uuid, uuid) from public, anon, authenticated;

create or replace function public.accept_invite_by_code(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_input text := public.normalize_invite_code(p_code);
  v_token text;
  v_invited_by uuid;
begin
  if v_input is null then
    raise exception 'enter your invite code';
  end if;

  -- Either form. A pasted 36-character token still works here, so the one
  -- input on "Enter invite code" can take whatever the person has.
  select token, invited_by into v_token, v_invited_by
  from public.challenge_invites
  where code = v_input or token = p_code
  limit 1;

  if v_token is null then
    raise exception 'invite not found';
  end if;

  if v_uid is not null and v_invited_by is not null then
    if public.has_other_active_partner(v_uid, v_invited_by) then
      raise exception 'You already have a partner. End that match before joining another.';
    end if;
    if public.has_other_active_partner(v_invited_by, v_uid) then
      raise exception 'This invite is no longer available. They have paired up with someone else.';
    end if;
  end if;

  return public.accept_challenge_invite(v_token);
end;
$$;

grant execute on function public.accept_invite_by_code(text) to authenticated;

create or replace function public.confirm_match(p_match_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, net, extensions
as $$
declare
  v_uid uuid := auth.uid();
  r record;
  v_both boolean;
  v_a_challenge uuid;
  v_b_challenge uuid;
  v_days int;
  v_other uuid;
  v_name text;
  v_tz text;
  v_local timestamp;
  v_key text;
  v_url text;
  v_plan uuid;
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

  -- One active partnership per person (202609301500). Without this the yes
  -- goes through and the pairing then dies inside the write to
  -- user_challenges with a raw unique violation. Say what happened instead.
  if public.has_other_active_partner(v_uid, case when r.user_a = v_uid then r.user_b else r.user_a end) then
    raise exception 'You already have a partner. End that match before accepting another.';
  end if;
  if public.has_other_active_partner(case when r.user_a = v_uid then r.user_b else r.user_a end, v_uid) then
    raise exception 'This match is no longer available. They have paired up with someone else.';
  end if;

  if v_uid = r.user_a then
    update public.partner_matches set a_confirmed = true, updated_at = now() where id = r.id;
    v_both := r.b_confirmed;
  else
    update public.partner_matches set b_confirmed = true, updated_at = now() where id = r.id;
    v_both := r.a_confirmed;
  end if;

  if not v_both then
    -- Handover §7.1: the moment one side says yes, the other hears about it
    -- and lands straight on their own accept screen. Never fatal — a failed
    -- notice must not undo the yes. Quiet hours (22:00-08:00 in the
    -- recipient's own time) get the in-app row only, no push, the same
    -- courtesy nudge_partner() extends.
    begin
      v_other := case when r.user_a = v_uid then r.user_b else r.user_a end;
      select split_part(coalesce(full_name, 'Your match'), ' ', 1) into v_name
      from public.profiles where id = v_uid;
      select coalesce(timezone, 'UTC') into v_tz from public.profiles where id = v_other;
      v_local := now() at time zone coalesce(v_tz, 'UTC');
      select value into v_key from public.app_config where key = 'service_role_key';
      select value into v_url from public.app_config where key = 'functions_base_url';

      if v_local::time >= time '22:00' or v_local::time < time '08:00'
         or v_key is null or v_url is null then
        insert into public.notifications (user_id, kind, title, body, data)
        values (v_other, 'partner_accepted', v_name || ' said yes',
                'Accept to start together.', jsonb_build_object('route', '/(tabs)/find'));
      else
        perform net.http_post(
          url := v_url || '/send-push',
          headers := jsonb_build_object('Content-Type', 'application/json',
                                        'Authorization', 'Bearer ' || v_key),
          body := jsonb_build_object(
            'userId', v_other,
            'kind', 'partner_accepted',
            'title', v_name || ' said yes',
            'body', 'Accept to start together.',
            'route', '/(tabs)/find'));
      end if;
    exception when others then
      raise notice 'confirm_match: acceptance notice failed, match unaffected';
    end;

    return jsonb_build_object('confirmed', true, 'both', false);
  end if;

  update public.partner_matches
  set status = 'confirmed', updated_at = now() where id = r.id;

  -- Use the challenges the match was actually made on. Falling back to
  -- ensure_user_challenge only covers pre-migration rows that never carried
  -- them; for anything new the ids are always present, so a second concurrent
  -- challenge can no longer be paired by accident.
  v_a_challenge := coalesce(r.user_challenge_a,
                            public.ensure_user_challenge(r.user_a, r.challenge_template_id));
  v_b_challenge := coalesce(r.user_challenge_b,
                            public.ensure_user_challenge(r.user_b, r.challenge_template_id));

  -- Honour the template's own length rather than a hardcoded 7 days —
  -- duration_days equality is a hard block in the matcher, so the two
  -- disagreeing was a real inconsistency.
  select coalesce(duration_days, 7) into v_days
  from public.challenge_templates where id = r.challenge_template_id;

  update public.user_challenges
  set partner_user_id = r.user_b, partner_state = 'partnered',
      status = 'active', started_at = now(),
      ends_at = now() + make_interval(days => coalesce(v_days, 7))
  where id = v_a_challenge;

  update public.user_challenges
  set partner_user_id = r.user_a, partner_state = 'partnered',
      status = 'active', started_at = now(),
      ends_at = now() + make_interval(days => coalesce(v_days, 7))
  where id = v_b_challenge;

  -- P4: a Running/Walking/Cycling pair gets a first run to plan (D4). The
  -- gate is additive (D1): nothing about the daily loop waits on it.
  if exists (select 1 from public.challenge_templates t
             where t.id = r.challenge_template_id
               and t.activity_key in ('running', 'walking', 'cycling')) then
    insert into public.pair_plans
      (user_a, user_b, challenge_a, challenge_b, template_id, activity_key,
       partner_match_id, kind, opener_id, mode)
    select r.user_a, r.user_b, v_a_challenge, v_b_challenge, r.challenge_template_id,
           t.activity_key, r.id, 'first_run',
           -- "Sent by whoever matched first": the person whose Find tap made
           -- the pairing; a sweep pairing has no requester, so user_a.
           coalesce(r.requested_by, r.user_a),
           public.resolve_pair_mode(
             (select mode from public.user_challenges where id = v_a_challenge),
             (select mode from public.user_challenges where id = v_b_challenge))
    from public.challenge_templates t where t.id = r.challenge_template_id
    on conflict do nothing
    returning id into v_plan;

    if v_plan is not null then
      insert into public.pair_plan_members (plan_id, user_id)
      values (v_plan, r.user_a), (v_plan, r.user_b);
    end if;
  end if;

  -- Close the requests out. Leaving them on 'matched' forever is what let
  -- stale rows pile up and collide with the one-waiting index later.
  update public.partner_match_requests
  set status = 'cancelled', updated_at = now()
  where user_challenge_id in (v_a_challenge, v_b_challenge)
    and status in ('waiting', 'matched');

  return jsonb_build_object('confirmed', true, 'both', true);
end;
$$;

revoke all on function public.confirm_match(uuid) from public, anon;
grant execute on function public.confirm_match(uuid) to authenticated;
