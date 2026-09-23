-- P5: planning the session (handover §3.4-3.9, §3.13-3.14).
--
-- "How far" is answered per person (§3.4's bug: one shared variable). When the
-- two answers match, that's the plan; when they differ, and for mode, place,
-- time and 6B day/time, the shared negotiation takes over: one person
-- suggests, the other says "Sounds good" or suggests another. Rounds are kept
-- so "Need help choosing?" can hand off to founders, and so the location
-- tracking fields in §3.7 are derived from history rather than stored twice.

alter table public.pair_plan_members add column if not exists planned_at timestamptz;

-- One notification path for every plan notice from here on: push through
-- send-push normally, in-app only during the recipient's quiet hours
-- (22:00-08:00 their time) or when push isn't configured. Never fatal.
create or replace function public.notify_user(
  p_user uuid, p_kind text, p_title text, p_body text, p_route text
) returns void
language plpgsql security definer set search_path = public, net, extensions
as $$
declare
  v_tz text; v_local timestamp; v_key text; v_url text;
begin
  select coalesce(timezone, 'UTC') into v_tz from public.profiles where id = p_user;
  v_local := now() at time zone coalesce(v_tz, 'UTC');
  select value into v_key from public.app_config where key = 'service_role_key';
  select value into v_url from public.app_config where key = 'functions_base_url';
  if v_local::time >= time '22:00' or v_local::time < time '08:00' or v_key is null or v_url is null then
    insert into public.notifications (user_id, kind, title, body, data)
    values (p_user, p_kind, p_title, p_body, jsonb_build_object('route', p_route));
  else
    perform net.http_post(
      url := v_url || '/send-push',
      headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_key),
      body := jsonb_build_object('userId', p_user, 'kind', p_kind, 'title', p_title,
                                 'body', p_body, 'route', p_route));
  end if;
exception when others then
  raise notice 'notify_user: % not delivered', p_kind;
end;
$$;
revoke all on function public.notify_user(uuid, text, text, text, text) from public, anon, authenticated;

create or replace function public.plan_distance_ok(p text) returns boolean language sql immutable as $$
  select p in ('1 to 2 km', '3 km', '5 km', '5 to 10 km', '10 km or more', 'Not sure yet');
$$;

-- §3.4: your own answer only. The other person's row is never touched here.
create or replace function public.set_distance_answer(p_plan_id uuid, p_value text)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid(); p public.pair_plans; v_theirs text;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  p := public.my_plan_member(p_plan_id);
  if p.id is null or p.status <> 'planning' then return jsonb_build_object('ok', false, 'reason', 'no_plan'); end if;
  if not public.plan_distance_ok(p_value) then return jsonb_build_object('ok', false, 'reason', 'bad_value'); end if;

  update public.pair_plan_members set distance_answer = p_value where plan_id = p.id and user_id = v_uid;
  select distance_answer into v_theirs from public.pair_plan_members where plan_id = p.id and user_id <> v_uid;

  if v_theirs = p_value then
    update public.pair_plans set distance = p_value, updated_at = now() where id = p.id;
    return jsonb_build_object('ok', true, 'agreed', true);
  end if;
  return jsonb_build_object('ok', true, 'agreed', false, 'conflict', v_theirs is not null);
end; $$;

-- Suggest (or counter) a value for one field. A new suggestion supersedes the
-- open one; the round count is what "after two rounds" is measured against.
create or replace function public.propose_plan_value(p_plan_id uuid, p_field text, p_value jsonb)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid(); p public.pair_plans; v_round int;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  p := public.my_plan_member(p_plan_id);
  if p.id is null or p.status <> 'planning' then return jsonb_build_object('ok', false, 'reason', 'no_plan'); end if;
  if p_field not in ('distance', 'mode', 'place', 'time', 'day_time') then
    return jsonb_build_object('ok', false, 'reason', 'bad_field');
  end if;
  if p_field = 'distance' and not public.plan_distance_ok(p_value #>> '{}') then
    return jsonb_build_object('ok', false, 'reason', 'bad_value');
  end if;
  if p_field = 'mode' and (p_value #>> '{}') not in ('together', 'separate') then
    return jsonb_build_object('ok', false, 'reason', 'bad_value');
  end if;
  if p_field = 'place' and coalesce(btrim(p_value ->> 'name'), '') = '' then
    return jsonb_build_object('ok', false, 'reason', 'bad_value');
  end if;
  if p_field in ('time', 'day_time') and (p_value ->> 'starts_at') is null then
    return jsonb_build_object('ok', false, 'reason', 'bad_value');
  end if;

  update public.pair_proposals set status = 'superseded', responded_at = now()
  where plan_id = p.id and field = p_field and status = 'open';

  select count(*) + 1 into v_round from public.pair_proposals where plan_id = p.id and field = p_field;
  insert into public.pair_proposals (plan_id, field, proposed_by, value, round)
  values (p.id, p_field, v_uid, p_value, v_round);

  if p_field = 'place' then
    update public.pair_plans
    set meeting_location_status = 'proposed',
        location_suggested_by = coalesce(location_suggested_by, v_uid),
        updated_at = now()
    where id = p.id;
  end if;
  return jsonb_build_object('ok', true, 'round', v_round);
end; $$;

-- Back steps out of a suggestion in progress before it leaves the screen.
create or replace function public.withdraw_plan_proposal(p_proposal_id uuid)
returns jsonb language plpgsql security definer set search_path = public
as $$
begin
  update public.pair_proposals set status = 'withdrawn', responded_at = now()
  where id = p_proposal_id and proposed_by = auth.uid() and status = 'open';
  return jsonb_build_object('ok', found);
end; $$;

-- "Sounds good": only the OTHER person can accept a suggestion.
create or replace function public.accept_plan_proposal(p_proposal_id uuid)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid(); r record; p public.pair_plans; v_other_at timestamptz;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select * into r from public.pair_proposals where id = p_proposal_id and status = 'open' for update;
  if r.id is null then return jsonb_build_object('ok', false, 'reason', 'not_open'); end if;
  p := public.my_plan_member(r.plan_id);
  if p.id is null or p.status <> 'planning' then return jsonb_build_object('ok', false, 'reason', 'no_plan'); end if;
  if r.proposed_by = v_uid then return jsonb_build_object('ok', false, 'reason', 'own_proposal'); end if;

  update public.pair_proposals set status = 'accepted', responded_at = now() where id = r.id;

  if r.field = 'distance' then
    update public.pair_plans set distance = r.value #>> '{}', updated_at = now() where id = p.id;
  elsif r.field = 'mode' then
    update public.pair_plans set mode = r.value #>> '{}', updated_at = now() where id = p.id;
  elsif r.field = 'place' then
    update public.pair_plans
    set place_name = btrim(r.value ->> 'name'),
        place_text = nullif(btrim(coalesce(r.value ->> 'text', '')), ''),
        meeting_location_status = case when founder_help_required then 'founder_assisted' else 'agreed' end,
        updated_at = now()
    where id = p.id;
  elsif r.field = 'time' then
    update public.pair_plans set starts_at = (r.value ->> 'starts_at')::timestamptz, updated_at = now() where id = p.id;
    update public.pair_plan_members set planned_at = (r.value ->> 'starts_at')::timestamptz where plan_id = p.id;
  elsif r.field = 'day_time' then
    -- 6B: "Same time" or "Different times", a time per person. The proposer's
    -- time is starts_at; other_at (if any) is the accepter's own.
    v_other_at := coalesce((r.value ->> 'other_at')::timestamptz, (r.value ->> 'starts_at')::timestamptz);
    update public.pair_plan_members set planned_at = (r.value ->> 'starts_at')::timestamptz
    where plan_id = p.id and user_id = r.proposed_by;
    update public.pair_plan_members set planned_at = v_other_at
    where plan_id = p.id and user_id <> r.proposed_by;
    update public.pair_plans
    set starts_at = least((r.value ->> 'starts_at')::timestamptz, v_other_at), updated_at = now()
    where id = p.id;
  end if;
  return jsonb_build_object('ok', true);
end; $$;

-- "Need help choosing?" — hands the field to founders. Manual on purpose.
create or replace function public.request_plan_help(p_plan_id uuid, p_field text)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare p public.pair_plans;
begin
  p := public.my_plan_member(p_plan_id);
  if p.id is null then return jsonb_build_object('ok', false, 'reason', 'no_plan'); end if;
  update public.pair_plans
  set founder_help_required = true,
      meeting_location_status = case when p_field = 'place' then 'needs_help' else meeting_location_status end,
      updated_at = now()
  where id = p.id;
  return jsonb_build_object('ok', true);
end; $$;

-- "I'm in" (6A) / "Commit together" (6B), per person. Both → the plan is on,
-- and whoever confirmed first hears about it.
create or replace function public.confirm_plan(p_plan_id uuid)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid(); p public.pair_plans; v_other uuid; v_both boolean; v_name text;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  p := public.my_plan_member(p_plan_id);
  if p.id is null or p.status <> 'planning' then return jsonb_build_object('ok', false, 'reason', 'no_plan'); end if;
  if p.distance is null or p.mode is null or p.starts_at is null
     or (p.mode = 'together' and p.meeting_location_status not in ('agreed', 'founder_assisted')) then
    return jsonb_build_object('ok', false, 'reason', 'not_agreed');
  end if;

  update public.pair_plan_members set confirmed_at = coalesce(confirmed_at, now())
  where plan_id = p.id and user_id = v_uid;
  v_other := case when p.user_a = v_uid then p.user_b else p.user_a end;
  select confirmed_at is not null into v_both from public.pair_plan_members where plan_id = p.id and user_id = v_other;

  if v_both then
    update public.pair_plans set status = 'confirmed', confirmed_at = now(), updated_at = now() where id = p.id;
    select split_part(coalesce(full_name, 'Your partner'), ' ', 1) into v_name from public.profiles where id = v_uid;
    perform public.notify_user(v_other, 'plan_confirmed', 'It''s on',
      v_name || ' is in too.', '/(tabs)/challenges');
  end if;
  return jsonb_build_object('ok', true, 'both', v_both);
end; $$;

-- "Plan a meetup" (D2): after the first run, any Running/Walking/Cycling pair
-- can plan another. Never gates the daily loop.
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
  if coalesce(v_key, '') not in ('running', 'walking', 'cycling') then
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

revoke all on function public.set_distance_answer(uuid, text) from public, anon;
grant execute on function public.set_distance_answer(uuid, text) to authenticated;
revoke all on function public.propose_plan_value(uuid, text, jsonb) from public, anon;
grant execute on function public.propose_plan_value(uuid, text, jsonb) to authenticated;
revoke all on function public.withdraw_plan_proposal(uuid) from public, anon;
grant execute on function public.withdraw_plan_proposal(uuid) to authenticated;
revoke all on function public.accept_plan_proposal(uuid) from public, anon;
grant execute on function public.accept_plan_proposal(uuid) to authenticated;
revoke all on function public.request_plan_help(uuid, text) from public, anon;
grant execute on function public.request_plan_help(uuid, text) to authenticated;
revoke all on function public.confirm_plan(uuid) from public, anon;
grant execute on function public.confirm_plan(uuid) to authenticated;
revoke all on function public.start_meetup_plan(uuid) from public, anon;
grant execute on function public.start_meetup_plan(uuid) to authenticated;

create or replace function public.get_pair_plan(p_user_challenge_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  p public.pair_plans;
  v_other uuid;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;

  select * into p from public.pair_plans
  where p_user_challenge_id in (challenge_a, challenge_b)
    and v_uid in (user_a, user_b)
    and (status in ('planning', 'confirmed', 'verified')
         -- A just-finished session stays visible for its completion screen.
         or (status = 'completed' and completed_at > now() - interval '18 hours'))
  order by created_at desc
  limit 1;

  if p.id is null then return null; end if;
  v_other := case when p.user_a = v_uid then p.user_b else p.user_a end;

  return jsonb_build_object(
    'id', p.id,
    'kind', p.kind,
    'status', p.status,
    'activity_key', p.activity_key,
    'mode', p.mode,
    'distance', p.distance,
    'place_name', p.place_name,
    'place_text', p.place_text,
    'meeting_location_status', p.meeting_location_status,
    'founder_help_required', p.founder_help_required,
    'starts_at', p.starts_at,
    'i_open', p.opener_id = v_uid,
    'me', (select to_jsonb(m) - 'plan_id' - 'user_id' from public.pair_plan_members m
           where m.plan_id = p.id and m.user_id = v_uid),
    'them', (select (to_jsonb(m) - 'plan_id' - 'user_id') || jsonb_build_object(
               'first_name', split_part(coalesce(pr.full_name, 'Your partner'), ' ', 1),
               'avatar_url', pr.avatar_url)
             from public.pair_plan_members m join public.profiles pr on pr.id = m.user_id
             where m.plan_id = p.id and m.user_id = v_other),
    'messages', coalesce((select jsonb_agg(jsonb_build_object(
               'mine', pm.sender_id = v_uid, 'key', pm.template_key) order by pm.created_at)
             from public.pair_messages pm where pm.plan_id = p.id), '[]'::jsonb),
    -- The live suggestion per field, and how many rounds each has taken —
    -- "Need help choosing?" appears after two rounds without agreement.
    'open_proposals', coalesce((select jsonb_agg(jsonb_build_object(
               'id', pp.id, 'field', pp.field, 'value', pp.value,
               'mine', pp.proposed_by = v_uid, 'round', pp.round))
             from public.pair_proposals pp where pp.plan_id = p.id and pp.status = 'open'), '[]'::jsonb),
    'rounds', coalesce((select jsonb_object_agg(field, n) from (
               select field, count(*) as n from public.pair_proposals
               where plan_id = p.id group by field) r), '{}'::jsonb)
  );
end;
$$;

notify pgrst, 'reload schema';
