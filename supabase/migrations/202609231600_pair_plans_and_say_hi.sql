-- P4: the session spine (see _bmad-output/.../sessions-architecture.md), the
-- "Plan your first run" gate and Say Hi (handover §3.1-3.3).
--
-- Every table is RLS-on with no policies: all reads and writes go through the
-- functions below, which answer as "me" and "them" relative to auth.uid() and
-- never expose user_a/user_b. That is the handover's §4 rule made structural —
-- the three "shared variable" bugs it found cannot be written against this.

create table if not exists public.pair_plans (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references auth.users(id) on delete cascade,
  user_b uuid not null references auth.users(id) on delete cascade,
  challenge_a uuid references public.user_challenges(id) on delete set null,
  challenge_b uuid references public.user_challenges(id) on delete set null,
  template_id uuid references public.challenge_templates(id) on delete set null,
  activity_key text,
  partner_match_id uuid references public.partner_matches(id) on delete set null,
  kind text not null check (kind in ('first_run', 'meetup')),
  status text not null default 'planning'
    check (status in ('planning', 'confirmed', 'verified', 'completed', 'cancelled', 'ended')),
  opener_id uuid references auth.users(id) on delete set null,
  mode text check (mode is null or mode in ('together', 'separate')),
  distance text,
  place_name text,
  place_text text,
  meeting_location_status text not null default 'not_set'
    check (meeting_location_status in ('not_set', 'proposed', 'agreed', 'needs_help', 'founder_assisted')),
  location_suggested_by uuid references auth.users(id) on delete set null,
  founder_help_required boolean not null default false,
  starts_at timestamptz,
  confirmed_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pair_plans_distinct check (user_a <> user_b)
);

-- One open plan per pairing at a time.
create unique index if not exists pair_plans_one_open
  on public.pair_plans (least(user_a, user_b), greatest(user_a, user_b), template_id)
  where status in ('planning', 'confirmed', 'verified');
create index if not exists pair_plans_user_a_idx on public.pair_plans (user_a, status);
create index if not exists pair_plans_user_b_idx on public.pair_plans (user_b, status);
alter table public.pair_plans enable row level security;

create table if not exists public.pair_plan_members (
  plan_id uuid not null references public.pair_plans(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  distance_answer text,
  mode_answer text check (mode_answer is null or mode_answer in ('together', 'separate')),
  confirmed_at timestamptz,
  on_my_way_at timestamptz,
  here_at timestamptz,
  finished_at timestamptz,
  checkin text check (checkin is null or checkin in ('done', 'later', 'cant')),
  checkin_at timestamptz,
  miss_reason text,
  primary key (plan_id, user_id)
);
alter table public.pair_plan_members enable row level security;

-- Canned only. No free text on Say Hi, ever (handover §3.2).
create table if not exists public.pair_messages (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.pair_plans(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  template_key text not null check (template_key in ('opener', 'lets_go', 'cant_wait', 'sounds_good')),
  created_at timestamptz not null default now(),
  constraint pair_messages_once unique (plan_id, sender_id)
);
alter table public.pair_messages enable row level security;

-- The shared negotiation component (P5 writes to it; created here so the
-- spine is reviewed as one piece).
create table if not exists public.pair_proposals (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.pair_plans(id) on delete cascade,
  field text not null check (field in ('distance', 'mode', 'place', 'time', 'day_time', 'reschedule')),
  proposed_by uuid not null references auth.users(id) on delete cascade,
  value jsonb not null,
  round int not null default 1,
  status text not null default 'open' check (status in ('open', 'accepted', 'superseded', 'withdrawn')),
  created_at timestamptz not null default now(),
  responded_at timestamptz
);
create index if not exists pair_proposals_open_idx on public.pair_proposals (plan_id, field, status);
alter table public.pair_proposals enable row level security;

-- Mode for the pair from each side's pre-match answer (D3). Separate wins over
-- Either; Together wins over Either; two Eithers (or no answers) stay null and
-- the pair is asked after matching.
create or replace function public.resolve_pair_mode(p_a text, p_b text)
returns text language sql immutable as $$
  select case
    when p_a = 'separate' or p_b = 'separate' then 'separate'
    when p_a = 'together' or p_b = 'together' then 'together'
    else null
  end;
$$;

-- The caller's membership, or null. Every plan RPC starts here.
create or replace function public.my_plan_member(p_plan_id uuid)
returns public.pair_plans
language sql stable security definer set search_path = public
as $$
  select p.* from public.pair_plans p
  where p.id = p_plan_id and auth.uid() in (p.user_a, p.user_b);
$$;
revoke all on function public.my_plan_member(uuid) from public, anon, authenticated;

-- The plan as the caller sees it: "me" and "them", never a and b.
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
             from public.pair_messages pm where pm.plan_id = p.id), '[]'::jsonb)
  );
end;
$$;
revoke all on function public.get_pair_plan(uuid) from public, anon;
grant execute on function public.get_pair_plan(uuid) to authenticated;

-- Say Hi: the opener sends "Hey, ready to do this?" first; the other person
-- answers with one of three canned replies. Each person speaks once.
create or replace function public.send_pair_message(p_plan_id uuid, p_key text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  p public.pair_plans;
  v_has_opener boolean;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  p := public.my_plan_member(p_plan_id);
  if p.id is null or p.status not in ('planning', 'confirmed') then
    return jsonb_build_object('ok', false, 'reason', 'no_plan');
  end if;

  select exists (select 1 from public.pair_messages where plan_id = p.id and template_key = 'opener')
    into v_has_opener;

  if p_key = 'opener' then
    if p.opener_id <> v_uid then return jsonb_build_object('ok', false, 'reason', 'not_opener'); end if;
  elsif p_key in ('lets_go', 'cant_wait', 'sounds_good') then
    if p.opener_id = v_uid then return jsonb_build_object('ok', false, 'reason', 'not_replier'); end if;
    if not v_has_opener then return jsonb_build_object('ok', false, 'reason', 'too_early'); end if;
  else
    return jsonb_build_object('ok', false, 'reason', 'bad_key');
  end if;

  begin
    insert into public.pair_messages (plan_id, sender_id, template_key) values (p.id, v_uid, p_key);
  exception when unique_violation then
    return jsonb_build_object('ok', false, 'reason', 'already_sent');
  end;
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.send_pair_message(uuid, text) from public, anon;
grant execute on function public.send_pair_message(uuid, text) to authenticated;

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

create or replace function public.end_pairings_between(p_me uuid, p_other uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  -- Proposals still waiting on an answer. Each side goes back to the pool,
  -- exactly as decline_match() releases them: the other person did nothing
  -- that should cost them their place in it.
  for r in
    select * from public.partner_matches
    where status = 'pending'
      and ((user_a = p_me and user_b = p_other) or (user_a = p_other and user_b = p_me))
    for update
  loop
    update public.partner_matches
    set status = 'ended', ended_at = now(), updated_at = now()
    where id = r.id;

    update public.partner_match_requests
    set status = 'waiting', no_match_at = null, updated_at = now()
    where user_challenge_id in (r.user_challenge_a, r.user_challenge_b)
      and status = 'matched';

    update public.user_challenges
    set partner_state = 'finding'
    where id in (r.user_challenge_a, r.user_challenge_b)
      and status in ('active', 'pending', 'paused');
  end loop;

  -- Live pairings. The relationship ends; neither challenge does.
  update public.partner_matches
  set status = 'ended', ended_at = now(), updated_at = now()
  where status = 'confirmed'
    and ((user_a = p_me and user_b = p_other) or (user_a = p_other and user_b = p_me));

  -- Back to solo rather than back into the pool: nobody who has just reported
  -- a safety concern should find themselves being matched again without
  -- asking. Clearing partner_user_id is also what revokes every partner-scoped
  -- read — is_partner_of() keys on it — so photos, reflections and the pair
  -- timeline close in the same statement.
  update public.user_challenges
  set partner_state = 'solo', partner_user_id = null
  where partner_state = 'partnered'
    and ((user_id = p_me and partner_user_id = p_other)
      or (user_id = p_other and partner_user_id = p_me));

  -- Block effects 1 and 2 (handover §5.2): any negotiation or not-yet-happened
  -- session between them ends too.
  update public.pair_plans
  set status = 'ended', updated_at = now()
  where status in ('planning', 'confirmed', 'verified')
    and ((user_a = p_me and user_b = p_other) or (user_a = p_other and user_b = p_me));

  insert into public.user_blocks (blocker_id, blocked_id)
  values (p_me, p_other)
  on conflict (blocker_id, blocked_id) do nothing;
end;
$$;
revoke all on function public.end_pairings_between(uuid, uuid) from public, anon, authenticated;

notify pgrst, 'reload schema';
