-- Issue #191, 10 November 2026: on "Different times", each person picks their
-- own time. The one suggesting no longer chooses the other person's.
--
-- So accepting a day_time suggestion can now carry the accepter's own time,
-- p_my_at. It is optional, with a default, so every client already installed
-- keeps calling this exactly as before and gets exactly the old behavior.
--
-- The old one-argument version is dropped first. Leaving it beside the new one
-- would make a call with only p_proposal_id ambiguous between the two.

drop function if exists public.accept_plan_proposal(uuid);

create function public.accept_plan_proposal(p_proposal_id uuid, p_my_at timestamptz default null)
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

  -- The accepter's own time (day_time only): on the same day as the
  -- proposer's, within a day of it, and not already gone. Checked before
  -- anything is written, so a refusal leaves the suggestion open.
  if p_my_at is not null and (
       r.field <> 'day_time'
       or abs(extract(epoch from p_my_at - (r.value ->> 'starts_at')::timestamptz)) > 86400
       or p_my_at <= now()) then
    return jsonb_build_object('ok', false, 'reason', 'bad_value');
  end if;

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
    -- time is starts_at. The accepter's own is, in order: the time they chose
    -- when they answered (p_my_at, 202611101500), a time the proposer picked
    -- for them (other_at, older clients), or the proposer's own.
    v_other_at := coalesce(p_my_at, (r.value ->> 'other_at')::timestamptz, (r.value ->> 'starts_at')::timestamptz);
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

revoke all on function public.accept_plan_proposal(uuid, timestamptz) from public, anon;
grant execute on function public.accept_plan_proposal(uuid, timestamptz) to authenticated;
