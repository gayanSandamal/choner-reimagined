-- P8: the temporary meetup chat (handover §6).
--
-- Replaces phone-number exchange entirely. Free text — the one deliberate
-- exception to "no free text" — because finding each other in the physical
-- world ("I'm the one in the red cap by the fountain") needs it. Time-boxed:
-- it opens at the meetup and closes at the QR scan (or, when rescheduling,
-- once both have agreed the new time). Every message is logged server-side so
-- a Report has something concrete to point at.
--
-- Filtering (D11, recommended default): phone numbers, links, @handles and
-- email addresses are refused on the server, so the chat can't turn back into
-- the phone-exchange problem in text form. The refused text is still logged
-- (blocked_reason set) and never delivered.

create table if not exists public.meetup_chats (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null unique references public.pair_plans(id) on delete cascade,
  reschedule boolean not null default false,
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  close_reason text check (close_reason is null or close_reason in ('qr', 'rescheduled', 'ended'))
);
alter table public.meetup_chats enable row level security;

create table if not exists public.meetup_messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.meetup_chats(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  blocked_reason text,
  created_at timestamptz not null default now()
);
create index if not exists meetup_messages_chat_idx on public.meetup_messages (chat_id, created_at);
alter table public.meetup_messages enable row level security;

-- Why a message may not be sent, or null. Mirrored in
-- features/plans/chat-filter.ts (a pre-check only; this is the rule).
create or replace function public.meetup_message_problem(p_body text)
returns text language plpgsql immutable as $$
declare v_digits int;
begin
  -- Seven or more digits in a phone-shaped run (+94 77 123 4567, 0771234567,
  -- 077-123-4567): Sri Lankan numbers are 9-10 digits, so 7 catches partials.
  v_digits := coalesce(length(regexp_replace(
    coalesce(substring(p_body from '\+?\d[\d\s().-]{5,}\d'), ''), '\D', '', 'g')), 0);
  if v_digits >= 7 then return 'phone_number'; end if;
  if p_body ~ '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}' then return 'email'; end if;
  if p_body ~* '(https?://|www\.|[a-z0-9-]+\.(com|lk|net|org|io|me|app|co|info)\M)' then return 'link'; end if;
  if p_body ~ '(^|\s)@[A-Za-z0-9_.]{2,}' then return 'handle'; end if;
  return null;
end; $$;

create or replace function public.open_meetup_chat(p_plan_id uuid, p_reschedule boolean)
returns void language sql security definer set search_path = public as $$
  insert into public.meetup_chats (plan_id, reschedule) values (p_plan_id, p_reschedule)
  on conflict (plan_id) do update
    set reschedule = public.meetup_chats.reschedule or excluded.reschedule;
$$;
revoke all on function public.open_meetup_chat(uuid, boolean) from public, anon, authenticated;

-- The chat as the caller sees it. Usable only while the plan is on and the
-- chat hasn't closed: the QR scan (status → verified), a block (→ ended) and
-- an agreed reschedule all end it.
create or replace function public.get_meetup_chat(p_plan_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public
as $$
declare v_uid uuid := auth.uid(); p public.pair_plans; c public.meetup_chats;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  p := public.my_plan_member(p_plan_id);
  if p.id is null then return null; end if;
  select * into c from public.meetup_chats where plan_id = p.id;
  if c.id is null then return jsonb_build_object('exists', false); end if;
  return jsonb_build_object(
    'exists', true,
    'open', c.closed_at is null and p.status = 'confirmed',
    'reschedule', c.reschedule,
    'messages', coalesce((select jsonb_agg(jsonb_build_object(
        'mine', m.sender_id = v_uid, 'body', m.body, 'at', m.created_at) order by m.created_at)
      from public.meetup_messages m where m.chat_id = c.id and m.blocked_reason is null), '[]'::jsonb)
  );
end; $$;

create or replace function public.send_meetup_message(p_plan_id uuid, p_body text)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid(); p public.pair_plans; c public.meetup_chats; v_body text; v_problem text; v_recent int;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  p := public.my_plan_member(p_plan_id);
  select * into c from public.meetup_chats where plan_id = p.id;
  if p.id is null or c.id is null or c.closed_at is not null or p.status <> 'confirmed' then
    return jsonb_build_object('ok', false, 'reason', 'closed');
  end if;
  v_body := btrim(coalesce(p_body, ''));
  if v_body = '' or char_length(v_body) > 500 then return jsonb_build_object('ok', false, 'reason', 'bad_length'); end if;

  select count(*) into v_recent from public.meetup_messages
  where chat_id = c.id and sender_id = v_uid and created_at > now() - interval '1 minute';
  if v_recent >= 20 then return jsonb_build_object('ok', false, 'reason', 'slow_down'); end if;

  v_problem := public.meetup_message_problem(v_body);
  insert into public.meetup_messages (chat_id, sender_id, body, blocked_reason)
  values (c.id, v_uid, v_body, v_problem);
  if v_problem is not null then return jsonb_build_object('ok', false, 'reason', v_problem); end if;
  return jsonb_build_object('ok', true);
end; $$;

revoke all on function public.get_meetup_chat(uuid) from public, anon;
grant execute on function public.get_meetup_chat(uuid) to authenticated;
revoke all on function public.send_meetup_message(uuid, text) from public, anon;
grant execute on function public.send_meetup_message(uuid, text) to authenticated;

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
    -- §6.2: both at the meeting place → the temporary chat opens.
    if v_other_here then
      perform public.open_meetup_chat(p.id, false);
    end if;
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

  -- §6.2: any real two-way answer opens the chat; "Won't be able to make it
  -- today" opens it with the reschedule panel pinned.
  perform public.open_meetup_chat(p.id, p_choice = 'cant_make_it');

  perform public.notify_user(v_other, 'plan_relay', public.first_name_of(v_uid) || ' ' || v_line,
    null, '/plan/' || public.plan_my_challenge(p, v_other), jsonb_build_object('planId', p.id));
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
  -- §6.3: a reschedule chat closes only once BOTH sides have confirmed the
  -- new time — the proposer by proposing it, the other by accepting it.
  update public.meetup_chats set closed_at = now(), close_reason = 'rescheduled'
  where plan_id = p.id and closed_at is null;

  perform public.notify_user(r.proposed_by, 'plan_reschedule',
    public.first_name_of(v_uid) || ' accepted the change', null,
    '/plan/' || public.plan_my_challenge(p, r.proposed_by), '{}'::jsonb);
  return jsonb_build_object('ok', true);
end; $$;

notify pgrst, 'reload schema';
