-- The first plan also sets how often. The cadence is shared.
--
-- 1 October, item 7: "cadence SHARED. It defines the week, the repair debt,
-- and how long a streak takes. Two cadences means two different weeks."
-- 202609301100 made days_per_week accept 1 to 7 and nullable, but nothing
-- ever set it for both people at once: each challenge kept whatever it had,
-- which for almost every row is the old default of 7.
--
-- It is agreed the way everything else in a plan is: one person suggests, the
-- other says yes or suggests another. So it is a new FIELD in the existing
-- negotiation rather than a new mechanism:
--
--   propose_plan_value(plan, 'cadence', 1..7)   7 is "Daily"
--   accept_plan_proposal()                      writes it to the plan AND to
--                                               both challenges' days_per_week
--
-- Asked ONCE PER PAIR, not once per plan. plan_cadence() answers from this
-- plan, or failing that from the pair's most recent plan that has one, so a
-- second session or a repair does not ask again. A pair made before this
-- migration has no cadence on any plan and is asked at their next one, which
-- is the right time: it is the first plan they make under the weekly model.
--
-- Four functions re-issued, each from its live body (checked by hash) with
-- only the cadence lines added:
--   propose_plan_value()    202609231700
--   accept_plan_proposal()  202609231700
--   confirm_plan()          202610012000
--   get_pair_plan()         202610012100

alter table public.pair_plans
  add column if not exists cadence int;

alter table public.pair_plans
  drop constraint if exists pair_plans_cadence_check;
alter table public.pair_plans
  add constraint pair_plans_cadence_check
  check (cadence is null or cadence between 1 and 7);

comment on column public.pair_plans.cadence is
  'Sessions a week the pair agreed, 1 to 7 (7 is Daily). Set by accepting a '
  '''cadence'' proposal, which also writes both user_challenges.days_per_week.';

create or replace function public.plan_cadence(p_plan_id uuid)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    p.cadence,
    (select o.cadence from public.pair_plans o
     where o.cadence is not null
       and least(o.user_a, o.user_b) = least(p.user_a, p.user_b)
       and greatest(o.user_a, o.user_b) = greatest(p.user_a, p.user_b)
     order by o.created_at desc limit 1)
  )
  from public.pair_plans p where p.id = p_plan_id;
$$;

revoke all on function public.plan_cadence(uuid) from public, anon, authenticated;

create or replace function public.propose_plan_value(p_plan_id uuid, p_field text, p_value jsonb)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid(); p public.pair_plans; v_round int;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  p := public.my_plan_member(p_plan_id);
  if p.id is null or p.status <> 'planning' then return jsonb_build_object('ok', false, 'reason', 'no_plan'); end if;
  if p_field not in ('distance', 'cadence', 'mode', 'place', 'time', 'day_time') then
    return jsonb_build_object('ok', false, 'reason', 'bad_field');
  end if;
  if p_field = 'distance' and not public.plan_distance_ok(p_value #>> '{}') then
    return jsonb_build_object('ok', false, 'reason', 'bad_value');
  end if;
  -- How often: 1 to 6 times a week, or 7 for Daily.
  if p_field = 'cadence' and (p_value #>> '{}') !~ '^[1-7]$' then
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
  elsif r.field = 'cadence' then
    -- SHARED. It defines the week for both of them, so it is written to the
    -- plan and to BOTH challenges in the same statement pair.
    update public.pair_plans set cadence = (r.value #>> '{}')::int, updated_at = now() where id = p.id;
    update public.user_challenges set days_per_week = (r.value #>> '{}')::int
    where id in (p.challenge_a, p.challenge_b);
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

create or replace function public.confirm_plan(p_plan_id uuid)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid(); p public.pair_plans; v_other uuid; v_both boolean; v_name text;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  p := public.my_plan_member(p_plan_id);
  if p.id is null or p.status <> 'planning' then return jsonb_build_object('ok', false, 'reason', 'no_plan'); end if;
  -- The amount is settled when BOTH have answered, whether or not the two
  -- answers match (1 October: the amount is per person, the cadence is shared).
  if (p.distance is null and exists (
        select 1 from public.pair_plan_members m
        where m.plan_id = p.id and m.distance_answer is null))
     -- How often is agreed once per pair, at their first plan.
     or public.plan_cadence(p.id) is null
     or p.mode is null or p.starts_at is null
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
    -- How often, shared. Agreed on this plan or carried from the pair's
    -- earlier one; null means it is still to be agreed (202610020910).
    'cadence', public.plan_cadence(p.id),
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

revoke all on function public.propose_plan_value(uuid, text, jsonb) from public, anon;
grant execute on function public.propose_plan_value(uuid, text, jsonb) to authenticated;
revoke all on function public.accept_plan_proposal(uuid) from public, anon;
grant execute on function public.accept_plan_proposal(uuid) to authenticated;
revoke all on function public.confirm_plan(uuid) from public, anon;
grant execute on function public.confirm_plan(uuid) to authenticated;
revoke all on function public.get_pair_plan(uuid) from public, anon;
grant execute on function public.get_pair_plan(uuid) to authenticated;
