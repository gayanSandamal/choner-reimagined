-- SCHEMA_CHALLENGES.md §5: ending a match, neutrally.
--
-- Until now the only ways out were block_partner and report_partner, both
-- safety actions. Someone who simply wants out had to treat their partner as a
-- safety problem.
--
-- Like block_partner this takes the caller's OWN challenge, never a user id:
-- the partner is resolved server-side so a client cannot end a stranger's
-- match.
--
-- Reasons are kept separate from REPORT_CATEGORIES on purpose: a report says
-- what was wrong with a person, this says why a pairing didn't work.
--
-- 'something_felt_off' is a door, not an outcome: the client hands off to the
-- report/block flow rather than calling this. It is still a legal stored value
-- (the doc lists six), so this function does not refuse it — see the PR.

create or replace function public.end_match(p_user_challenge_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_partner uuid;
  v_a uuid;
  v_b uuid;
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  if p_reason is null or p_reason not in (
    'no_time_worked', 'stopped_replying', 'pace_mismatch',
    'changing_what_i_do', 'something_felt_off', 'prefer_not_to_say'
  ) then
    raise exception 'unknown reason';
  end if;

  select partner_user_id into v_partner
  from public.user_challenges
  where id = p_user_challenge_id and user_id = v_uid and partner_state = 'partnered';

  if v_partner is null then
    raise exception 'no active match';
  end if;

  v_a := least(v_uid, v_partner);
  v_b := greatest(v_uid, v_partner);

  -- Record the reason FIRST. The trigger on user_challenges would otherwise
  -- end the partnership itself with no reason attached.
  update public.partnerships
  set state = 'ended', ended_at = now(), ended_by = v_uid, end_reason = p_reason
  where user_a = v_a and user_b = v_b and state = 'active'
  returning id into v_id;

  if v_id is null then
    raise exception 'no active match';
  end if;

  -- The relationship ends; neither challenge does. Back to solo, not back into
  -- the pool: they can choose to search again.
  update public.user_challenges
  set partner_state = 'solo', partner_user_id = null
  where partner_state = 'partnered'
    and ((user_id = v_uid and partner_user_id = v_partner)
      or (user_id = v_partner and partner_user_id = v_uid));

  update public.partner_matches
  set status = 'ended', ended_at = now(), updated_at = now()
  where status = 'confirmed'
    and ((user_a = v_uid and user_b = v_partner) or (user_a = v_partner and user_b = v_uid));

  -- Sessions not yet held end with the match (same as block, handover §5.2).
  update public.pair_plans
  set status = 'ended', updated_at = now()
  where status in ('planning', 'confirmed', 'verified')
    and ((user_a = v_uid and user_b = v_partner) or (user_a = v_partner and user_b = v_uid));

  -- The other person is told only that it ended. Never the reason.
  perform public.notify_match_ended(v_partner);
end;
$$;

revoke all on function public.end_match(uuid, text) from public, anon;
grant execute on function public.end_match(uuid, text) to authenticated;
