-- Every activity can plan a session, not only the four measured in distance.
--
-- Decided 26 September and never built: "Every activity (Running, Jogging,
-- Yoga, Walking, Cycling, Workouts) can plan sessions; no
-- running/walking/cycling-only gate." Three places still had the gate:
--
--   confirm_match()      created the first plan only for running, walking and
--                        cycling. A Jogging, Yoga or Workouts pair was matched
--                        and then had nothing to plan
--   start_meetup_plan()  refused Yoga and Workouts with 'not_supported'
--   plan_distance_ok()   "how much" only accepted distances, so even with the
--                        gate open a Yoga pair could not answer it
--
-- Yoga and Workouts are measured in MINUTES (1 October), so the answer list
-- gains durations. The column and the functions keep the word "distance":
-- renaming it would touch every plan function for no change in behaviour, and
-- the value has always been stored as the label the person picked.
--
-- confirm_match() and start_meetup_plan() are re-issued from their live bodies
-- (checked by hash) with only the activity list changed.

create or replace function public.plan_distance_ok(p text) returns boolean language sql immutable as $$
  select p in (
    -- distance: running, jogging, walking, cycling
    '1 to 2 km', '3 km', '5 km', '5 to 10 km', '10 km or more',
    -- duration: yoga, workouts
    '10 min', '15 min', '20 min', '30 min', '45 min', '60 min or more',
    'Not sure yet');
$$;

create or replace function public.start_meetup_plan(p_user_challenge_id uuid)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid(); uc record; v_partner_uc uuid; v_plan uuid; v_key text;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select * into uc from public.user_challenges
  where id = p_user_challenge_id and user_id = v_uid and partner_state = 'partnered';
  if uc.id is null then return jsonb_build_object('ok', false, 'reason', 'no_partner'); end if;
  select activity_key into v_key from public.challenge_templates where id = uc.challenge_template_id;
  if coalesce(v_key, '') not in ('running', 'jogging', 'walking', 'cycling', 'yoga', 'home_workouts') then
    return jsonb_build_object('ok', false, 'reason', 'not_supported');
  end if;
  select id into v_partner_uc from public.user_challenges
  where user_id = uc.partner_user_id and partner_user_id = v_uid and partner_state = 'partnered'
  order by started_at desc nulls last limit 1;

  insert into public.pair_plans (user_a, user_b, challenge_a, challenge_b, template_id, activity_key,
                                 kind, opener_id, mode)
  values (v_uid, uc.partner_user_id, uc.id, v_partner_uc, uc.challenge_template_id, v_key,
          'meetup', v_uid,
          public.resolve_pair_mode(uc.mode, (select mode from public.user_challenges where id = v_partner_uc)))
  on conflict do nothing
  returning id into v_plan;
  if v_plan is null then return jsonb_build_object('ok', false, 'reason', 'already_planning'); end if;
  insert into public.pair_plan_members (plan_id, user_id) values (v_plan, v_uid), (v_plan, uc.partner_user_id);
  return jsonb_build_object('ok', true);
end; $$;

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

  -- Every pair on one of the six activities gets a first session to plan
  -- (26 September: "Every activity can plan sessions; no
  -- running/walking/cycling-only gate"). A pair on a retired habit with no
  -- activity still gets none, because there is nothing to plan.
  if exists (select 1 from public.challenge_templates t
             where t.id = r.challenge_template_id
               and t.activity_key in ('running', 'jogging', 'walking', 'cycling', 'yoga', 'home_workouts')) then
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

revoke all on function public.start_meetup_plan(uuid) from public, anon;
grant execute on function public.start_meetup_plan(uuid) to authenticated;
revoke all on function public.confirm_match(uuid) from public, anon;
grant execute on function public.confirm_match(uuid) to authenticated;
