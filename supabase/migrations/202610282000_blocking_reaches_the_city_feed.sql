-- Blocking reaches the city feed.
--
-- A block has always been person-level and permanent: user_blocks, written by
-- end_pairings_between(), read by the matcher and by the directory, and
-- invisible to every client. Two places honoured it. The city feed did not.
--
-- So someone could block a partner for a safety reason and carry on seeing
-- that person's milestones in Community the next morning — with their first
-- name and face on the card — and the blocked person would keep seeing theirs.
-- get_city_feed() had no reference to user_blocks at all.
--
-- WHY THIS IS NOT AN RLS POLICY
--
-- The obvious fix is a policy on the feed's tables. It cannot work here.
-- user_blocks has RLS enabled and NO policies at all, on purpose, so a policy
-- expression — which runs as the calling user — sees zero rows, the filter
-- never matches, and nothing is filtered. It fails silently, which is worse
-- than failing. get_city_feed() is already security definer, so the filter
-- belongs inside it, exactly as get_directory() does it.
--
-- WHY blocked_between() IS REVOKED
--
-- The one rule 202609231000 set down is that the blocked person is never told.
-- A helper taking two user ids would break it: anyone could call
-- blocked_between(me, someone) and learn who had blocked them. It is revoked
-- from every client role and called only from the definer functions below.
--
-- WHY THE CLIENT NEVER SENDS A USER ID
--
-- features/safety/api.ts states the rule: every call names the caller's own
-- challenge or match, never a user id, and the server resolves the other end.
-- The feed is the same. block_milestone_sharer() takes the milestone the card
-- was drawn from and resolves who shared it, so the feed payload still carries
-- first names and avatars and no identifiers to act on.

-- ============================================================
-- 1. The predicate, usable only from definer functions
-- ============================================================

create or replace function public.blocked_between(p_a uuid, p_b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_blocks b
    where (b.blocker_id = p_a and b.blocked_id = p_b)
       or (b.blocker_id = p_b and b.blocked_id = p_a)
  );
$$;

revoke all on function public.blocked_between(uuid, uuid) from public, anon, authenticated;

-- ============================================================
-- 2. The feed honours blocks, in both directions
-- ============================================================
--
-- A milestone card names two people — the sharer and, for a pair milestone,
-- their partner. Blocking either one hides the card: seeing "Nuwan and <the
-- person you blocked>" is the thing being prevented, and which of the two
-- shared it is an implementation detail to the reader.

create or replace function public.get_city_feed(p_limit int default 30, p_include_sessions boolean default false)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_city text;
  v_rows jsonb;
begin
  if v_uid is null then
    return jsonb_build_object('city', null, 'items', '[]'::jsonb);
  end if;

  select city into v_city from public.profiles where id = v_uid;

  select coalesce(jsonb_agg(row_to_json(x)::jsonb order by x.created_at desc), '[]'::jsonb)
    into v_rows
  from (
    select
      m.id,
      m.kind,
      m.habit_title,
      m.streak_days,
      m.created_at,
      split_part(coalesce(sp.full_name, 'Someone'), ' ', 1) as sharer_name,
      split_part(coalesce(pp.full_name, ''), ' ', 1) as partner_name,
      sp.avatar_url as sharer_avatar,
      pp.avatar_url as partner_avatar,
      (select count(*) from public.milestone_reactions r where r.milestone_id = m.id) as reactions,
      exists (
        select 1 from public.milestone_reactions r
        where r.milestone_id = m.id and r.user_id = v_uid
      ) as i_reacted,
      -- Your own milestones appear in your feed. The card needs to know, so it
      -- can leave off a menu whose only item would be "block yourself".
      (m.shared_by = v_uid) as is_mine
    from public.milestones m
    left join public.profiles sp on sp.id = m.shared_by
    left join public.profiles pp on pp.id = m.partner_user_id
    where m.shared
      and m.city is not null
      and m.city = v_city
      and not public.blocked_between(v_uid, m.shared_by)
      and (m.partner_user_id is null or not public.blocked_between(v_uid, m.partner_user_id))
    union all
    -- A session both partners chose to share (D9: a pair post needs BOTH
    -- yeses). Only for clients that ask — older builds don't know this kind.
    select
      pl.id, 'session_together', case when pl.kind = 'first_run' then 'first run' else 'run' end,
      null::int, pl.completed_at,
      split_part(coalesce(pa.full_name, 'Someone'), ' ', 1),
      split_part(coalesce(pb.full_name, ''), ' ', 1),
      pa.avatar_url, pb.avatar_url,
      0::bigint, false,
      -- True when you are one of the pair. The card hides its menu for every
      -- session post regardless, since a pair post has two people and no one
      -- sharer for block_milestone_sharer() to resolve.
      (pl.user_a = v_uid or pl.user_b = v_uid)
    from public.pair_plans pl
    join public.profiles pa on pa.id = pl.user_a
    join public.profiles pb on pb.id = pl.user_b
    where p_include_sessions
      and pl.status = 'completed'
      and pa.city is not null and pa.city = v_city
      and (select count(*) from public.session_shares s where s.plan_id = pl.id and s.shared) = 2
      and not public.blocked_between(v_uid, pl.user_a)
      and not public.blocked_between(v_uid, pl.user_b)
    order by 5 desc
    limit greatest(1, least(coalesce(p_limit, 30), 100))
  ) x;

  return jsonb_build_object('city', v_city, 'items', v_rows);
end;
$$;

grant execute on function public.get_city_feed(int, boolean) to authenticated;

-- ============================================================
-- 3. Blocking someone you have only read about
-- ============================================================
--
-- end_pairings_between() does the whole job and is already the only writer of
-- user_blocks: it ends a live pairing if there is one, puts both challenges
-- back to solo, and records the block. Reusing it is what keeps a block from
-- the feed identical to a block from the pair menu — including for the common
-- case where the person in the feed IS your partner.
--
-- The notification is sent only when a pairing actually ended, and it is the
-- same neutral line as everywhere else. Blocking a stranger tells them
-- nothing, because there is nothing to tell them about.

create or replace function public.block_milestone_sharer(p_milestone_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_sharer uuid;
  v_was_partner boolean;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select m.shared_by into v_sharer
  from public.milestones m
  where m.id = p_milestone_id and m.shared;

  -- Gone, never shared, or your own card. Nothing to do, and the client is
  -- told only that this one cannot be blocked.
  if v_sharer is null or v_sharer = v_uid then
    return jsonb_build_object('ok', false, 'reason', 'not_blockable');
  end if;

  select exists (
    select 1 from public.user_challenges
    where user_id = v_uid
      and partner_user_id = v_sharer
      and partner_state = 'partnered'
  ) into v_was_partner;

  perform public.end_pairings_between(v_uid, v_sharer);
  if v_was_partner then
    perform public.notify_match_ended(v_sharer);
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.block_milestone_sharer(uuid) from public, anon;
grant execute on function public.block_milestone_sharer(uuid) to authenticated;
