-- P6: day of, QR verification, finish, 6B check-in and recovery, and push
-- flows #2-#4 (handover §3.10-3.12, §3.15-3.16, §7.2-7.4).

alter table public.pair_plans
  add column if not exists qr_nonce text,
  add column if not exists qr_issued_by uuid references auth.users(id) on delete set null,
  add column if not exists qr_expires_at timestamptz,
  add column if not exists qr_verified_at timestamptz;

alter table public.pair_plan_members
  add column if not exists cant_make_it_at timestamptz,
  add column if not exists encouraged_at timestamptz;

alter table public.pair_proposals drop constraint if exists pair_proposals_field_check;
alter table public.pair_proposals add constraint pair_proposals_field_check
  check (field in ('distance', 'mode', 'place', 'time', 'day_time', 'reschedule'));

-- notify_user gains data and an optional notification category (the action
-- buttons of the day-of relay). Replaces the 5-argument version.
drop function if exists public.notify_user(uuid, text, text, text, text);
create or replace function public.notify_user(
  p_user uuid, p_kind text, p_title text, p_body text, p_route text,
  p_data jsonb default '{}'::jsonb, p_category text default null
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
    values (p_user, p_kind, p_title, p_body, coalesce(p_data, '{}'::jsonb) || jsonb_build_object('route', p_route));
  else
    perform net.http_post(
      url := v_url || '/send-push',
      headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_key),
      body := jsonb_build_object('userId', p_user, 'kind', p_kind, 'title', p_title,
                                 'body', p_body, 'route', p_route, 'data', coalesce(p_data, '{}'::jsonb),
                                 'categoryId', p_category));
  end if;
exception when others then
  raise notice 'notify_user: % not delivered', p_kind;
end;
$$;
revoke all on function public.notify_user(uuid, text, text, text, text, jsonb, text) from public, anon, authenticated;

-- The other member of a plan, their first name, and each side's challenge.
create or replace function public.plan_other(p public.pair_plans, p_me uuid)
returns uuid language sql immutable as $$
  select case when p.user_a = p_me then p.user_b else p.user_a end;
$$;
create or replace function public.plan_my_challenge(p public.pair_plans, p_me uuid)
returns uuid language sql immutable as $$
  select case when p.user_a = p_me then p.challenge_a else p.challenge_b end;
$$;
create or replace function public.first_name_of(p_user uuid)
returns text language sql stable security definer set search_path = public as $$
  select split_part(coalesce(full_name, 'Your partner'), ' ', 1) from public.profiles where id = p_user;
$$;
revoke all on function public.first_name_of(uuid) from public, anon, authenticated;

-- ============================================================
-- Day of (Run together)
-- ============================================================
-- "I'm on my way" / "I'm here", per person (§3.10's bug was one shared flag).
-- "I'm here" notifies the partner with three options (§7.2) — a live
-- handshake, so it carries the relay category and the plan id.
create or replace function public.set_arrival(p_plan_id uuid, p_state text)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare v_uid uuid := auth.uid(); p public.pair_plans; v_other uuid; v_other_here boolean;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  p := public.my_plan_member(p_plan_id);
  if p.id is null or p.status <> 'confirmed' or p.mode <> 'together' then
    return jsonb_build_object('ok', false, 'reason', 'no_plan');
  end if;
  if p_state not in ('on_my_way', 'here') then return jsonb_build_object('ok', false, 'reason', 'bad_state'); end if;
  v_other := public.plan_other(p, v_uid);

  if p_state = 'on_my_way' then
    update public.pair_plan_members set on_my_way_at = coalesce(on_my_way_at, now())
    where plan_id = p.id and user_id = v_uid;
  else
    update public.pair_plan_members
    set here_at = coalesce(here_at, now()), on_my_way_at = coalesce(on_my_way_at, now())
    where plan_id = p.id and user_id = v_uid;
    select here_at is not null into v_other_here from public.pair_plan_members where plan_id = p.id and user_id = v_other;
    if not v_other_here then
      perform public.notify_user(v_other, 'plan_arrived',
        public.first_name_of(v_uid) || ' is here',
        'Let them know where you are.',
        '/plan/' || public.plan_my_challenge(p, v_other),
        jsonb_build_object('planId', p.id), 'plan_relay');
    end if;
  end if;
  return jsonb_build_object('ok', true);
end; $$;

-- The partner's answer to the relay: "I'm here too" / "On my way" / "Won't be
-- able to make it today". Any of them opens the meetup chat (P8).
create or replace function public.relay_response(p_plan_id uuid, p_choice text)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare v_uid uuid := auth.uid(); p public.pair_plans; v_other uuid; v_line text;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  p := public.my_plan_member(p_plan_id);
  if p.id is null or p.status <> 'confirmed' then return jsonb_build_object('ok', false, 'reason', 'no_plan'); end if;
  v_other := public.plan_other(p, v_uid);

  if p_choice = 'here_too' then
    update public.pair_plan_members set here_at = coalesce(here_at, now()), on_my_way_at = coalesce(on_my_way_at, now())
    where plan_id = p.id and user_id = v_uid;
    v_line := 'is here too';
  elsif p_choice = 'on_my_way' then
    update public.pair_plan_members set on_my_way_at = coalesce(on_my_way_at, now())
    where plan_id = p.id and user_id = v_uid;
    v_line := 'is on the way';
  elsif p_choice = 'cant_make_it' then
    update public.pair_plan_members set cant_make_it_at = coalesce(cant_make_it_at, now())
    where plan_id = p.id and user_id = v_uid;
    v_line := 'can''t make it today';
  else
    return jsonb_build_object('ok', false, 'reason', 'bad_choice');
  end if;

  perform public.notify_user(v_other, 'plan_relay', public.first_name_of(v_uid) || ' ' || v_line,
    null, '/plan/' || public.plan_my_challenge(p, v_other), jsonb_build_object('planId', p.id));
  return jsonb_build_object('ok', true);
end; $$;

-- ============================================================
-- QR verification
-- ============================================================
-- Short-lived and single-session. Only once BOTH are here: it never opens on
-- one person's "I'm here".
create or replace function public.issue_session_qr(p_plan_id uuid)
returns jsonb language plpgsql security definer set search_path = public, extensions
as $$
declare v_uid uuid := auth.uid(); p public.pair_plans; v_both boolean; v_nonce text;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  p := public.my_plan_member(p_plan_id);
  if p.id is null or p.status <> 'confirmed' then return jsonb_build_object('ok', false, 'reason', 'no_plan'); end if;
  select bool_and(here_at is not null) into v_both from public.pair_plan_members where plan_id = p.id;
  if not v_both then return jsonb_build_object('ok', false, 'reason', 'not_both_here'); end if;

  v_nonce := encode(gen_random_bytes(9), 'hex');
  update public.pair_plans
  set qr_nonce = v_nonce, qr_issued_by = v_uid, qr_expires_at = now() + interval '2 minutes', updated_at = now()
  where id = p.id;
  return jsonb_build_object('ok', true, 'payload', 'choner:plan:' || p.id || ':' || v_nonce,
                            'expires_at', now() + interval '2 minutes');
end; $$;

-- The OTHER person scans. A successful scan IS the check-in — for both.
create or replace function public.verify_session_qr(p_payload text)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid(); v_parts text[]; p public.pair_plans; v_uc uuid; v_task uuid;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  v_parts := string_to_array(coalesce(p_payload, ''), ':');
  if array_length(v_parts, 1) <> 4 or v_parts[1] <> 'choner' or v_parts[2] <> 'plan' then
    return jsonb_build_object('ok', false, 'reason', 'not_a_choner_code');
  end if;
  begin
    p := public.my_plan_member(v_parts[3]::uuid);
  exception when invalid_text_representation then
    return jsonb_build_object('ok', false, 'reason', 'not_a_choner_code');
  end;
  if p.id is null or p.status <> 'confirmed' then return jsonb_build_object('ok', false, 'reason', 'no_plan'); end if;
  if p.qr_issued_by = v_uid then return jsonb_build_object('ok', false, 'reason', 'own_code'); end if;
  if p.qr_nonce is distinct from v_parts[4] or p.qr_expires_at < now() then
    return jsonb_build_object('ok', false, 'reason', 'expired');
  end if;

  update public.pair_plans
  set status = 'verified', qr_verified_at = now(), qr_nonce = null, updated_at = now()
  where id = p.id;

  -- Log today's habit for both, unless already logged in the last 12 hours.
  foreach v_uc in array array[p.challenge_a, p.challenge_b] loop
    continue when v_uc is null;
    select id into v_task from public.challenge_tasks where user_challenge_id = v_uc order by sort_order, created_at limit 1;
    continue when v_task is null;
    if not exists (select 1 from public.task_checkins
                   where user_challenge_id = v_uc and status = 'completed' and completed_at > now() - interval '12 hours') then
      insert into public.task_checkins (challenge_task_id, user_challenge_id, status, note)
      values (v_task, v_uc, 'completed', 'Verified together');
    end if;
  end loop;
  return jsonb_build_object('ok', true);
end; $$;

-- Finish: one tap, a timestamp, nothing else (§3.12, D10).
create or replace function public.finish_session(p_plan_id uuid)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare v_uid uuid := auth.uid(); p public.pair_plans; v_both boolean;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  p := public.my_plan_member(p_plan_id);
  if p.id is null or p.status <> 'verified' then return jsonb_build_object('ok', false, 'reason', 'no_plan'); end if;
  update public.pair_plan_members set finished_at = coalesce(finished_at, now()) where plan_id = p.id and user_id = v_uid;
  select bool_and(finished_at is not null) into v_both from public.pair_plan_members where plan_id = p.id;
  if v_both then
    update public.pair_plans set status = 'completed', completed_at = now(), updated_at = now() where id = p.id;
  end if;
  return jsonb_build_object('ok', true, 'both', v_both);
end; $$;

-- ============================================================
-- Run separately, together: check-in (§3.16)
-- ============================================================
-- done / later / cant, per person. The habit itself is logged by the app's
-- existing check-in (camera-only photo, value prompt) before 'done' is sent.
create or replace function public.set_session_checkin(p_plan_id uuid, p_state text, p_reason text default null)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid(); p public.pair_plans; v_other uuid; v_prev text; v_both boolean; v_name text;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  p := public.my_plan_member(p_plan_id);
  if p.id is null or p.status <> 'confirmed' or p.mode <> 'separate' then
    return jsonb_build_object('ok', false, 'reason', 'no_plan');
  end if;
  if p_state not in ('done', 'later', 'cant') then return jsonb_build_object('ok', false, 'reason', 'bad_state'); end if;
  if p_state = 'cant' and coalesce(p_reason, '') not in ('Too tired', 'No time', 'Weather', 'Work', 'Not feeling well', 'Something else') then
    return jsonb_build_object('ok', false, 'reason', 'bad_reason');
  end if;

  select checkin into v_prev from public.pair_plan_members where plan_id = p.id and user_id = v_uid;
  update public.pair_plan_members
  set checkin = p_state, checkin_at = now(), miss_reason = case when p_state = 'cant' then p_reason else miss_reason end
  where plan_id = p.id and user_id = v_uid;

  v_other := public.plan_other(p, v_uid);
  v_name := public.first_name_of(v_uid);

  if p_state = 'later' then
    -- §3.16: the partner is told, in the handover's words.
    perform public.notify_user(v_other, 'plan_update',
      v_name || ' hasn''t run yet. They will do it later today.', null,
      '/plan/' || public.plan_my_challenge(p, v_other), '{}'::jsonb);
  elsif p_state = 'done' then
    -- "I've completed it" after "Doing it later" notifies the partner (§7.3);
    -- a first-time Done does too — the partner's async screen waits on it.
    perform public.notify_user(v_other, 'plan_update',
      v_name || ' completed their ' || coalesce(p.distance, 'run') || '.', null,
      '/plan/' || public.plan_my_challenge(p, v_other), '{}'::jsonb);
    select bool_and(checkin = 'done') into v_both from public.pair_plan_members where plan_id = p.id;
    if v_both then
      update public.pair_plans set status = 'completed', completed_at = now(), updated_at = now() where id = p.id;
    end if;
  end if;
  return jsonb_build_object('ok', true, 'was', v_prev);
end; $$;

-- Recovery: "Try tomorrow instead?" proposes a new day/time; the partner sees
-- it and can "Accept the change" (accept_reschedule) or "Send encouragement".
create or replace function public.propose_reschedule(p_plan_id uuid, p_starts_at timestamptz)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare v_uid uuid := auth.uid(); p public.pair_plans; v_other uuid;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  p := public.my_plan_member(p_plan_id);
  if p.id is null or p.status <> 'confirmed' then return jsonb_build_object('ok', false, 'reason', 'no_plan'); end if;
  if p_starts_at is null or p_starts_at < now() then return jsonb_build_object('ok', false, 'reason', 'bad_time'); end if;
  update public.pair_proposals set status = 'superseded', responded_at = now()
  where plan_id = p.id and field = 'reschedule' and status = 'open';
  insert into public.pair_proposals (plan_id, field, proposed_by, value, round)
  values (p.id, 'reschedule', v_uid, jsonb_build_object('starts_at', p_starts_at),
          1 + (select count(*) from public.pair_proposals where plan_id = p.id and field = 'reschedule'));
  v_other := public.plan_other(p, v_uid);
  perform public.notify_user(v_other, 'plan_reschedule',
    public.first_name_of(v_uid) || ' suggested a new time', 'Tap to see it.',
    '/plan/' || public.plan_my_challenge(p, v_other), '{}'::jsonb);
  return jsonb_build_object('ok', true);
end; $$;

create or replace function public.accept_reschedule(p_proposal_id uuid)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare v_uid uuid := auth.uid(); r record; p public.pair_plans; v_at timestamptz;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select * into r from public.pair_proposals where id = p_proposal_id and field = 'reschedule' and status = 'open' for update;
  if r.id is null then return jsonb_build_object('ok', false, 'reason', 'not_open'); end if;
  p := public.my_plan_member(r.plan_id);
  if p.id is null or r.proposed_by = v_uid then return jsonb_build_object('ok', false, 'reason', 'not_yours'); end if;
  v_at := (r.value ->> 'starts_at')::timestamptz;
  update public.pair_proposals set status = 'accepted', responded_at = now() where id = r.id;
  -- A fresh day: everyone's day-of state resets; the plan itself stays on.
  update public.pair_plans set starts_at = v_at, qr_nonce = null, updated_at = now() where id = p.id;
  update public.pair_plan_members
  set planned_at = v_at, on_my_way_at = null, here_at = null, cant_make_it_at = null,
      checkin = null, checkin_at = null
  where plan_id = p.id;
  perform public.notify_user(r.proposed_by, 'plan_reschedule',
    public.first_name_of(v_uid) || ' accepted the change', null,
    '/plan/' || public.plan_my_challenge(p, r.proposed_by), '{}'::jsonb);
  return jsonb_build_object('ok', true);
end; $$;

create or replace function public.send_encouragement(p_plan_id uuid)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare v_uid uuid := auth.uid(); p public.pair_plans; v_other uuid;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  p := public.my_plan_member(p_plan_id);
  if p.id is null then return jsonb_build_object('ok', false, 'reason', 'no_plan'); end if;
  update public.pair_plan_members set encouraged_at = now()
  where plan_id = p.id and user_id = v_uid
    and (encouraged_at is null or encouraged_at < now() - interval '1 hour');
  if not found then return jsonb_build_object('ok', false, 'reason', 'already_sent'); end if;
  v_other := public.plan_other(p, v_uid);
  perform public.notify_user(v_other, 'plan_encouragement',
    public.first_name_of(v_uid) || ' is cheering you on', 'You''ve got this.',
    '/plan/' || public.plan_my_challenge(p, v_other), '{}'::jsonb);
  return jsonb_build_object('ok', true);
end; $$;

-- "Met" now includes the QR scan, as the handover defines it (§5.4).
create or replace function public.pairing_has_met(p_challenge_a uuid, p_challenge_b uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.task_checkins tc
    join public.user_challenges uc on uc.id = tc.user_challenge_id
    where tc.user_challenge_id in (p_challenge_a, p_challenge_b)
      and tc.status = 'completed'
      and tc.completed_at >= uc.started_at
  ) or exists (
    select 1 from public.pair_plans pp
    where pp.qr_verified_at is not null
      and ((pp.challenge_a = p_challenge_a and pp.challenge_b = p_challenge_b)
        or (pp.challenge_a = p_challenge_b and pp.challenge_b = p_challenge_a))
  );
$$;
revoke all on function public.pairing_has_met(uuid, uuid) from public, anon, authenticated;
revoke all on function public.set_arrival(uuid, text) from public, anon;
grant execute on function public.set_arrival(uuid, text) to authenticated;
revoke all on function public.relay_response(uuid, text) from public, anon;
grant execute on function public.relay_response(uuid, text) to authenticated;
revoke all on function public.issue_session_qr(uuid) from public, anon;
grant execute on function public.issue_session_qr(uuid) to authenticated;
revoke all on function public.verify_session_qr(text) from public, anon;
grant execute on function public.verify_session_qr(text) to authenticated;
revoke all on function public.finish_session(uuid) from public, anon;
grant execute on function public.finish_session(uuid) to authenticated;
revoke all on function public.set_session_checkin(uuid, text, text) from public, anon;
grant execute on function public.set_session_checkin(uuid, text, text) to authenticated;
revoke all on function public.propose_reschedule(uuid, timestamptz) from public, anon;
grant execute on function public.propose_reschedule(uuid, timestamptz) to authenticated;
revoke all on function public.accept_reschedule(uuid) from public, anon;
grant execute on function public.accept_reschedule(uuid) to authenticated;
revoke all on function public.send_encouragement(uuid) from public, anon;
grant execute on function public.send_encouragement(uuid) to authenticated;

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
    'qr_verified_at', p.qr_verified_at,
    'qr_mine', p.qr_issued_by = v_uid and p.qr_expires_at > now(),
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
