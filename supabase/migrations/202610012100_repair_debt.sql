-- SCHEMA_CHALLENGES.md §6: the repair debt.
--
-- 202609301200 added is_repair and repairs_plan_id, and 202609301600 the sweep
-- that marks a session missed. Nothing said what is OWED after a miss, so the
-- columns had no way to be used. This is that rule, as functions.
--
-- THE ONE DECISION MADE HERE: what "the week" is for two people in two
-- timezones. §6 says "plan another before Sunday" and "one repair per week"
-- without saying whose Sunday, which is the same gap due_at had. It is closed
-- the same way: the pair runs on the clock of whichever of the two has the
-- LATER day. A session's day ends at the later of the two midnights
-- (plan_due_at), so the week it belongs to is the Monday-to-Sunday week in
-- that same person's timezone. One rule for the day and the week, and nobody
-- is told a week has ended while it is still Sunday where they are.
--
-- The rules, all from §6:
--   - a miss leaves BOTH owing one session (the plan row is shared, so there
--     is one debt for the pair, not one each)
--   - one repair per week. The FIRST miss of a week is repairable; a second
--     miss in the same week is lost: circle marked, no debt
--   - repair is choosing when: this week or next. An unpaid "this week" rolls
--     into next week by itself, so the choice is a preference, not a trap
--   - the debt lapses at the end of the week after the miss. That is the
--     moment the circle RESOLVES as missed (§1: "missed and not repaired")
--   - the repair session fills the missed circle: it carries repairs_plan_id
--     and the ordinary plan flow runs. One attempt: a repair that is itself
--     missed spends the debt
--   - it needs the same partner. A debt cannot be paid with someone new.

alter table public.pair_plans
  add column if not exists repair_preference text;

alter table public.pair_plans
  drop constraint if exists pair_plans_repair_preference_check;
alter table public.pair_plans
  add constraint pair_plans_repair_preference_check
  check (repair_preference is null or repair_preference in ('this_week', 'next_week'));

comment on column public.pair_plans.repair_preference is
  'On a MISSED session: when the pair would rather make it up. A preference, '
  'not a deadline. Unpaid this_week rolls into next week by itself.';

-- End of the Monday-to-Sunday week containing p_ts, in zone p_tz. Same
-- fallback as local_day_end(): a bad zone must not break a read.
create or replace function public.local_week_end(p_ts timestamptz, p_tz text)
returns timestamptz
language plpgsql
stable
as $$
begin
  return (date_trunc('week', p_ts at time zone coalesce(nullif(p_tz, ''), 'UTC')) + interval '7 days')
         at time zone coalesce(nullif(p_tz, ''), 'UTC');
exception when others then
  return (date_trunc('week', p_ts at time zone 'UTC') + interval '7 days') at time zone 'UTC';
end;
$$;

-- The week p_ts belongs to FOR THIS PAIR: measured on the clock of whichever
-- of the two has the later local day at that moment.
create or replace function public.pair_week_end(p_ts timestamptz, p_a uuid, p_b uuid)
returns timestamptz
language sql
stable
security definer
set search_path = public
as $$
  select public.local_week_end(p_ts, z.tz)
  from (
    select pr.timezone as tz
    from unnest(array[p_a, p_b]) as u(id)
    left join public.profiles pr on pr.id = u.id
    order by public.local_day_end(p_ts, pr.timezone) desc
    limit 1
  ) z;
$$;

revoke all on function public.pair_week_end(timestamptz, uuid, uuid) from public, anon, authenticated;

-- Where one missed session stands. Internal: the two callers below check who
-- is asking before they use it.
--
--   owed         repairable now
--   in_progress  a repair session is planned and not yet held
--   repaired     the repair was completed; the circle is filled
--   spent        the one repair attempt was itself missed
--   lost         not the first miss of its week
--   expired      the week after the miss has ended
--   no_partner   the pair is no longer partnered
--   not_a_miss   not a missed, non-repair session
create or replace function public.repair_state(p_plan_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  m public.pair_plans;
  v_at timestamptz;
  v_week_end timestamptz;
  v_repair_status text;
begin
  select * into m from public.pair_plans where id = p_plan_id;
  if m.id is null or m.status <> 'missed' or m.is_repair then
    return 'not_a_miss';
  end if;

  v_at := coalesce(m.starts_at, m.due_at, m.updated_at);
  v_week_end := public.pair_week_end(v_at, m.user_a, m.user_b);

  -- An earlier miss by the same pair on the same challenges in the same week
  -- makes this one the second: lost.
  if exists (
    select 1 from public.pair_plans o
    where o.id <> m.id
      and o.status = 'missed' and not o.is_repair
      and least(o.user_a, o.user_b) = least(m.user_a, m.user_b)
      and greatest(o.user_a, o.user_b) = greatest(m.user_a, m.user_b)
      and coalesce(o.starts_at, o.due_at, o.updated_at) < v_at
      and public.pair_week_end(coalesce(o.starts_at, o.due_at, o.updated_at), o.user_a, o.user_b) = v_week_end
  ) then
    return 'lost';
  end if;

  select r.status into v_repair_status
  from public.pair_plans r
  where r.repairs_plan_id = m.id and r.status not in ('cancelled', 'ended')
  order by r.created_at desc limit 1;

  if v_repair_status = 'completed' then return 'repaired'; end if;
  if v_repair_status = 'missed' then return 'spent'; end if;
  if v_repair_status is not null then return 'in_progress'; end if;

  if not public.is_partner_of(m.user_a, m.user_b) then
    return 'no_partner';
  end if;
  -- One hour past the week's end is safely inside the following week.
  if now() > public.pair_week_end(v_week_end + interval '1 hour', m.user_a, m.user_b) then
    return 'expired';
  end if;
  return 'owed';
end;
$$;

revoke all on function public.repair_state(uuid) from public, anon, authenticated;

-- What the caller's pair owes on this challenge, if anything. The oldest open
-- debt first: with a two-week window there can briefly be two.
create or replace function public.get_repair_debt(p_user_challenge_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  m record;
  v_state text;
  v_week_end timestamptz;
  v_lost int := 0;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  for m in
    select p.* from public.pair_plans p
    where p_user_challenge_id in (p.challenge_a, p.challenge_b)
      and v_uid in (p.user_a, p.user_b)
      and p.status = 'missed' and not p.is_repair
    order by coalesce(p.starts_at, p.due_at, p.updated_at)
  loop
    v_state := public.repair_state(m.id);
    if v_state = 'lost' then
      v_lost := v_lost + 1;
    elsif v_state in ('owed', 'in_progress') then
      v_week_end := public.pair_week_end(coalesce(m.starts_at, m.due_at, m.updated_at), m.user_a, m.user_b);
      return jsonb_build_object(
        'owed', true,
        'state', v_state,
        'missed_plan_id', m.id,
        'missed_at', coalesce(m.starts_at, m.due_at),
        -- Past this, "this week" is no longer on offer and it has rolled.
        'this_week_ends_at', v_week_end,
        'repair_by', public.pair_week_end(v_week_end + interval '1 hour', m.user_a, m.user_b),
        'preference', m.repair_preference,
        'when', case when now() >= v_week_end then 'next_week'
                     else coalesce(m.repair_preference, 'this_week') end,
        'repair_plan_id', (select r.id from public.pair_plans r
                           where r.repairs_plan_id = m.id
                             and r.status in ('planning', 'confirmed', 'verified')
                           order by r.created_at desc limit 1),
        'lost', v_lost
      );
    end if;
  end loop;

  return jsonb_build_object('owed', false, 'lost', v_lost);
end;
$$;

revoke all on function public.get_repair_debt(uuid) from public, anon;
grant execute on function public.get_repair_debt(uuid) to authenticated;

-- This week or next. Either of the two can say; it is the pair's preference.
create or replace function public.set_repair_preference(p_missed_plan_id uuid, p_when text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_state text;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  if p_when is null or p_when not in ('this_week', 'next_week') then
    return jsonb_build_object('ok', false, 'reason', 'bad_value');
  end if;
  if not exists (
    select 1 from public.pair_plans p
    where p.id = p_missed_plan_id and v_uid in (p.user_a, p.user_b)
  ) then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  v_state := public.repair_state(p_missed_plan_id);
  if v_state <> 'owed' then
    return jsonb_build_object('ok', false, 'reason', v_state);
  end if;

  update public.pair_plans
  set repair_preference = p_when, updated_at = now()
  where id = p_missed_plan_id;
  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.set_repair_preference(uuid, text) from public, anon;
grant execute on function public.set_repair_preference(uuid, text) to authenticated;

-- Opens the make-up session. From here the ordinary plan flow runs: how much,
-- mode, where, when, and the partner accepts like any other session.
create or replace function public.start_repair_plan(p_missed_plan_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  m public.pair_plans;
  v_state text;
  v_plan uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select * into m from public.pair_plans
  where id = p_missed_plan_id and v_uid in (user_a, user_b);
  if m.id is null then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  v_state := public.repair_state(m.id);
  if v_state <> 'owed' then
    return jsonb_build_object('ok', false, 'reason', v_state);
  end if;

  -- One repair per week, counted on the pair's clock, whichever miss it is for.
  if exists (
    select 1 from public.pair_plans r
    where r.is_repair
      and r.status not in ('cancelled', 'ended')
      and least(r.user_a, r.user_b) = least(m.user_a, m.user_b)
      and greatest(r.user_a, r.user_b) = greatest(m.user_a, m.user_b)
      and public.pair_week_end(r.created_at, m.user_a, m.user_b)
          = public.pair_week_end(now(), m.user_a, m.user_b)
  ) then
    return jsonb_build_object('ok', false, 'reason', 'one_per_week');
  end if;

  insert into public.pair_plans (user_a, user_b, challenge_a, challenge_b, template_id, activity_key,
                                 kind, opener_id, mode, is_repair, repairs_plan_id)
  values (m.user_a, m.user_b, m.challenge_a, m.challenge_b, m.template_id, m.activity_key,
          'meetup', v_uid, m.mode, true, m.id)
  on conflict do nothing
  returning id into v_plan;

  -- pair_plans_one_open: the pair already has a session being planned.
  if v_plan is null then
    return jsonb_build_object('ok', false, 'reason', 'already_planning');
  end if;

  insert into public.pair_plan_members (plan_id, user_id)
  values (v_plan, m.user_a), (v_plan, m.user_b);

  return jsonb_build_object('ok', true, 'plan_id', v_plan);
end;
$$;

revoke all on function public.start_repair_plan(uuid) from public, anon;
grant execute on function public.start_repair_plan(uuid) to authenticated;

-- get_pair_plan(), re-issued from 202609231900 (the live body, checked by
-- hash before this was written) with three keys added so the client can tell
-- a make-up session from an ordinary one. Nothing else changed.
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
    -- A make-up session, and the missed one it fills (202610012100).
    'is_repair', p.is_repair,
    'repairs_plan_id', p.repairs_plan_id,
    'due_at', p.due_at,
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
    'reactions', coalesce((select jsonb_agg(jsonb_build_object('mine', r.from_user = v_uid, 'reaction', r.reaction))
             from public.plan_reactions r where r.plan_id = p.id), '[]'::jsonb),
    'my_share', (select shared from public.session_shares s where s.plan_id = p.id and s.user_id = v_uid),
    'rounds', coalesce((select jsonb_object_agg(field, n) from (
               select field, count(*) as n from public.pair_proposals
               where plan_id = p.id group by field) r), '{}'::jsonb)
  );
end;
$$;

revoke all on function public.get_pair_plan(uuid) from public, anon;
grant execute on function public.get_pair_plan(uuid) to authenticated;
