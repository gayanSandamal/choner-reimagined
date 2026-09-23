-- report_partner: don't lose a report to a block that landed first.
--
-- If A blocks while B is filling in a report, B's submission found no live
-- partner and returned 'no_partner' — the report, a safety record, vanished.
-- Unchanged from 202609231000 apart from the fallback. Invited pairs have no
-- match row, so for them the race still ends in 'no_partner' (rare: it needs
-- a block and a report on the same pairing within seconds).

create or replace function public.report_partner(
  p_user_challenge_id uuid,
  p_category text,
  p_free_text text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_partner uuid;
  v_partner_challenge uuid;
  v_match uuid;
  v_met boolean;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select partner_user_id into v_partner
  from public.user_challenges
  where id = p_user_challenge_id and user_id = v_uid and partner_state = 'partnered'
  for update;

  -- The race: the other person blocked a moment before this report landed,
  -- so there is no live partner any more. A report is a safety record and
  -- must not be lost to timing, so fall back to the pairing on THIS challenge
  -- that ended in the last ten minutes. Nothing about who ended it is
  -- returned — the reporter sees the same confirmation either way.
  if v_partner is null then
    select pm.id,
           case when pm.user_a = v_uid then pm.user_b else pm.user_a end,
           case when pm.user_a = v_uid then pm.user_challenge_b else pm.user_challenge_a end
      into v_match, v_partner, v_partner_challenge
    from public.partner_matches pm
    where pm.status = 'ended'
      and pm.ended_at > now() - interval '10 minutes'
      and ((pm.user_a = v_uid and pm.user_challenge_a = p_user_challenge_id)
        or (pm.user_b = v_uid and pm.user_challenge_b = p_user_challenge_id))
    order by pm.ended_at desc
    limit 1;

    if v_partner is null then
      return jsonb_build_object('ok', false, 'reason', 'no_partner');
    end if;

    v_met := public.pairing_has_met(p_user_challenge_id, v_partner_challenge);
    if not v_met and p_category not in ('fake_profile', 'something_else') then
      return jsonb_build_object('ok', false, 'reason', 'category_unavailable');
    end if;

    insert into public.user_reports
      (reporter_user_id, reported_user_id, partner_match_id, category, free_text, met)
    values
      (v_uid, v_partner, v_match, p_category, nullif(btrim(p_free_text), ''), v_met);

    -- Record the reporter's side of the block too. The pairing already ended,
    -- so there is nothing else to end and nobody new to notify.
    insert into public.user_blocks (blocker_id, blocked_id)
    values (v_uid, v_partner)
    on conflict (blocker_id, blocked_id) do nothing;

    return jsonb_build_object('ok', true);
  end if;

  select id into v_partner_challenge
  from public.user_challenges
  where user_id = v_partner and partner_user_id = v_uid and partner_state = 'partnered'
  order by started_at desc nulls last
  limit 1;

  v_met := public.pairing_has_met(p_user_challenge_id, v_partner_challenge);

  -- Re-checked here rather than trusted from the client: before a meeting only
  -- the two categories that can already be true are accepted.
  if not v_met and p_category not in ('fake_profile', 'something_else') then
    return jsonb_build_object('ok', false, 'reason', 'category_unavailable');
  end if;

  -- Invited pairs have no match row, so this is legitimately null for them.
  select id into v_match
  from public.partner_matches
  where status = 'confirmed'
    and ((user_a = v_uid and user_b = v_partner) or (user_a = v_partner and user_b = v_uid))
  order by updated_at desc
  limit 1;

  insert into public.user_reports
    (reporter_user_id, reported_user_id, partner_match_id, category, free_text, met)
  values
    (v_uid, v_partner, v_match, p_category, nullif(btrim(p_free_text), ''), v_met);

  perform public.end_pairings_between(v_uid, v_partner);
  perform public.notify_match_ended(v_partner);

  return jsonb_build_object('ok', true);
end;
$$;

notify pgrst, 'reload schema';
