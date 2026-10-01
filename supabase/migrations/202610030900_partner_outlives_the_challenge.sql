-- SCHEMA_CHALLENGES.md §7: ending a challenge does not end the match.
--
--   | Event           | Challenge | Partnership   | Streak                  |
--   | Challenge ends  | ends      | CONTINUES     | ends, saved to history  |
--   | Match ends      | continues | ends          | kept, intact            |
--
-- The partnerships table (202609301000) made this possible. Nothing used it:
-- "End this challenge" was a plain status update from the client, the ended
-- state showed no partner, and the next challenge started solo. And the only
-- way to end a match needed a challenge to name, so someone between
-- challenges could not end their match at all.
--
-- Six pieces:
--
--   get_my_partner()        who I am partnered with, WHETHER OR NOT I have a
--                           challenge. The ended state reads this to keep
--                           showing "You + Gayan"
--   end_challenge()         ends the challenge and its open sessions, releases
--                           a search in progress, and leaves the partnership
--                           alone. Returns the score the streak ended on
--   inherit trigger         a new challenge created while partnered is born
--                           partnered, so picking the next activity does not
--                           quietly drop the partner
--   end_my_match()          the neutral way out, resolved from the partnership
--                           instead of from a challenge id
--   start_meetup_plan()     refuses while the partner has no live challenge,
--                           with a reason the app can explain
--   report_partner()        the ten-minute fallback also reads partnerships,
--                           so a report can follow an ended match for an
--                           invited pair as well as a matched one
--
-- start_meetup_plan() and report_partner() are re-issued from their live
-- bodies (checked by hash) with only those lines added.

-- ============================================================
-- 1. Who am I partnered with
-- ============================================================
create or replace function public.get_my_partner()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  p public.partnerships;
  v_other uuid;
  v_mine uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select * into p from public.partnerships
  where state = 'active' and v_uid in (user_a, user_b)
  limit 1;
  if p.id is null then
    return jsonb_build_object('partnered', false);
  end if;
  v_other := case when p.user_a = v_uid then p.user_b else p.user_a end;

  -- A challenge of MINE that still names this partner: the live one if there
  -- is one, otherwise the most recent. Block and report take a challenge id,
  -- and they must stay reachable between challenges.
  select uc.id into v_mine
  from public.user_challenges uc
  where uc.user_id = v_uid and uc.partner_user_id = v_other
  order by (uc.status in ('active', 'pending', 'paused')) desc, uc.started_at desc nulls last
  limit 1;

  return jsonb_build_object(
    'partnered', true,
    'first_name', (select split_part(coalesce(full_name, 'Your partner'), ' ', 1) from public.profiles where id = v_other),
    'avatar_url', (select avatar_url from public.profiles where id = v_other),
    'since', p.started_at,
    'my_challenge_id', v_mine,
    -- What the pair is paired ON: my live activity, else theirs.
    'paired_on', coalesce(
      (select coalesce(nullif(btrim(uc.custom_habit_title), ''), t.title)
       from public.user_challenges uc left join public.challenge_templates t on t.id = uc.challenge_template_id
       where uc.user_id = v_uid and uc.status in ('active', 'pending', 'paused')
       order by uc.started_at desc nulls last limit 1),
      (select coalesce(nullif(btrim(uc.custom_habit_title), ''), t.title)
       from public.user_challenges uc left join public.challenge_templates t on t.id = uc.challenge_template_id
       where uc.user_id = v_other and uc.status in ('active', 'pending', 'paused')
       order by uc.started_at desc nulls last limit 1)),
    'i_have_challenge', exists (
      select 1 from public.user_challenges uc
      where uc.user_id = v_uid and uc.status in ('active', 'pending', 'paused')),
    'partner_has_challenge', exists (
      select 1 from public.user_challenges uc
      where uc.user_id = v_other and uc.status in ('active', 'pending', 'paused')),
    -- The heart: sessions both completed, with THIS partner.
    'sessions_together', (
      select count(*) from public.pair_plans pl
      where pl.status = 'completed'
        and least(pl.user_a, pl.user_b) = p.user_a
        and greatest(pl.user_a, pl.user_b) = p.user_b)
  );
end;
$$;

revoke all on function public.get_my_partner() from public, anon;
grant execute on function public.get_my_partner() to authenticated;

-- ============================================================
-- 2. A challenge created while partnered is born partnered
-- ============================================================
create or replace function public.inherit_partner_on_new_challenge()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_other uuid;
begin
  if new.partner_user_id is not null or coalesce(new.partner_state, 'solo') <> 'solo' then
    return new;
  end if;

  select case when ps.user_a = new.user_id then ps.user_b else ps.user_a end
    into v_other
  from public.partnerships ps
  where ps.state = 'active' and new.user_id in (ps.user_a, ps.user_b)
  limit 1;

  if v_other is not null then
    new.partner_user_id := v_other;
    new.partner_state := 'partnered';
  end if;
  return new;
end;
$$;

revoke all on function public.inherit_partner_on_new_challenge() from public, anon, authenticated;

drop trigger if exists user_challenges_inherit_partner on public.user_challenges;
create trigger user_challenges_inherit_partner
  before insert on public.user_challenges
  for each row execute function public.inherit_partner_on_new_challenge();

-- ============================================================
-- 3. End a challenge, keep the partner
-- ============================================================
create or replace function public.end_challenge(p_user_challenge_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  uc public.user_challenges;
  r record;
  v_done int;
  v_partner_name text;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select * into uc from public.user_challenges
  where id = p_user_challenge_id and user_id = v_uid
  for update;
  if uc.id is null then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  if uc.status not in ('active', 'pending', 'paused') then
    return jsonb_build_object('ok', false, 'reason', 'already_ended');
  end if;

  -- A search in progress ends with the challenge it was for. Anyone already
  -- offered as a match goes back into the pool: they did nothing wrong.
  for r in
    select * from public.partner_matches
    where status = 'pending'
      and p_user_challenge_id in (user_challenge_a, user_challenge_b)
    for update
  loop
    update public.partner_matches set status = 'expired', updated_at = now() where id = r.id;
    update public.partner_match_requests
    set status = 'waiting', no_match_at = null, updated_at = now()
    where user_challenge_id in (r.user_challenge_a, r.user_challenge_b)
      and user_challenge_id <> p_user_challenge_id
      and status = 'matched';
    update public.user_challenges
    set partner_state = 'finding'
    where id in (r.user_challenge_a, r.user_challenge_b)
      and id <> p_user_challenge_id
      and partner_state = 'matched';
  end loop;

  update public.partner_match_requests
  set status = 'cancelled', updated_at = now()
  where user_challenge_id = p_user_challenge_id and status in ('waiting', 'matched');

  -- Sessions not yet held end with the challenge. A missed one stays missed.
  update public.pair_plans
  set status = 'ended', updated_at = now()
  where status in ('planning', 'confirmed', 'verified')
    and p_user_challenge_id in (challenge_a, challenge_b);

  -- The score the streak ends on, counted the way history counts it.
  select count(*) into v_done from public.pair_plans p
  where p_user_challenge_id in (p.challenge_a, p.challenge_b)
    and not p.is_repair
    and (p.status = 'completed'
         or (p.status = 'missed' and exists (
               select 1 from public.pair_plans x
               where x.repairs_plan_id = p.id and x.status = 'completed')));

  -- A PARTNERED row keeps its partner columns on purpose: touching them fires
  -- the sync trigger, and the point of this function is that the partnership
  -- is not touched. Any search state is cleared.
  update public.user_challenges
  set status = 'abandoned',
      completed_at = now(),
      partner_state = case when partner_state = 'partnered' then 'partnered' else 'solo' end
  where id = p_user_challenge_id;

  if uc.partner_state = 'partnered' and uc.partner_user_id is not null then
    select split_part(coalesce(full_name, 'Your partner'), ' ', 1) into v_partner_name
    from public.profiles where id = uc.partner_user_id;
  end if;

  return jsonb_build_object(
    'ok', true,
    'done', v_done,
    'target', uc.target_sessions,
    'partner_kept', v_partner_name is not null,
    'partner_first_name', v_partner_name
  );
end;
$$;

revoke all on function public.end_challenge(uuid) from public, anon;
grant execute on function public.end_challenge(uuid) to authenticated;

-- ============================================================
-- 4. End the match, from the partnership
-- ============================================================
-- Same effect as end_match(), without needing a challenge to name: someone who
-- has just ended their challenge still has a match, and must be able to end
-- that too. The reason is private; the other person is told only that it ended.
create or replace function public.end_my_match(p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  p public.partnerships;
  v_other uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  if p_reason is null or p_reason not in (
    'no_time_worked', 'stopped_replying', 'pace_mismatch',
    'changing_what_i_do', 'something_felt_off', 'prefer_not_to_say'
  ) then
    return jsonb_build_object('ok', false, 'reason', 'bad_reason');
  end if;

  select * into p from public.partnerships
  where state = 'active' and v_uid in (user_a, user_b)
  for update;
  if p.id is null then
    return jsonb_build_object('ok', false, 'reason', 'no_partner');
  end if;
  v_other := case when p.user_a = v_uid then p.user_b else p.user_a end;

  -- The reason FIRST: the trigger on user_challenges would otherwise end the
  -- partnership itself with no reason attached.
  update public.partnerships
  set state = 'ended', ended_at = now(), ended_by = v_uid, end_reason = p_reason
  where id = p.id;

  -- The relationship ends; neither challenge does. Back to solo, not into the
  -- pool: they choose whether to search again.
  update public.user_challenges
  set partner_state = 'solo', partner_user_id = null
  where partner_state = 'partnered'
    and ((user_id = v_uid and partner_user_id = v_other)
      or (user_id = v_other and partner_user_id = v_uid));

  update public.partner_matches
  set status = 'ended', ended_at = now(), updated_at = now()
  where status = 'confirmed'
    and ((user_a = v_uid and user_b = v_other) or (user_a = v_other and user_b = v_uid));

  update public.pair_plans
  set status = 'ended', updated_at = now()
  where status in ('planning', 'confirmed', 'verified')
    and ((user_a = v_uid and user_b = v_other) or (user_a = v_other and user_b = v_uid));

  perform public.notify_match_ended(v_other);
  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.end_my_match(text) from public, anon;
grant execute on function public.end_my_match(text) to authenticated;

-- ============================================================
-- 5 and 6. Re-issued with the lines described at the top
-- ============================================================
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
  -- The partner's LIVE challenge. They may have ended theirs and not picked a
  -- new activity yet: still partners, but there is nothing of theirs for a
  -- session to count toward, so say so instead of planning against a dead row.
  select id into v_partner_uc from public.user_challenges
  where user_id = uc.partner_user_id and partner_user_id = v_uid and partner_state = 'partnered'
    and status in ('active', 'pending', 'paused')
  order by started_at desc nulls last limit 1;
  if v_partner_uc is null then
    return jsonb_build_object('ok', false, 'reason', 'partner_no_challenge');
  end if;

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

    -- A pair made by INVITE has no match row, so the lookup above finds
    -- nothing for them. The partnership does: it is the one record every pair
    -- has. This is what lets "Something felt off" end the match first and
    -- still offer the report afterwards, whichever way the pair was made.
    if v_partner is null then
      select case when ps.user_a = v_uid then ps.user_b else ps.user_a end
        into v_partner
      from public.partnerships ps
      where ps.state = 'ended'
        and ps.ended_at > now() - interval '10 minutes'
        and v_uid in (ps.user_a, ps.user_b)
      order by ps.ended_at desc
      limit 1;

      if v_partner is not null then
        select id into v_partner_challenge
        from public.user_challenges
        where user_id = v_partner
        order by started_at desc nulls last
        limit 1;
      end if;
    end if;

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

revoke all on function public.start_meetup_plan(uuid) from public, anon;
grant execute on function public.start_meetup_plan(uuid) to authenticated;
revoke all on function public.report_partner(uuid, text, text) from public, anon;
grant execute on function public.report_partner(uuid, text, text) to authenticated;
