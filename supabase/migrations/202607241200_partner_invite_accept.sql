-- Partner invite: make acceptance actually work end-to-end.
--
-- Before this migration accepting an invite only flipped the *inviter's*
-- partner challenge to 'active' (and only when the invite carried a
-- user_challenge_id, which the post-onboarding invite screen never set). The
-- accepter's own partner track stayed 'pending', so neither the two-sided
-- pairing nor the Home partner card ever lit up.
--
-- This migration:
--   1. Rewrites accept_challenge_invite to light BOTH sides and to fall back
--      to the inviter's newest pending partner challenge for older,
--      unlinked invites.
--   2. Adds get_partner_status(), a security-definer read used by Home to
--      show the partner's name, avatar, and whether they've logged today
--      (task_checkins / user_challenges are owner-only under RLS, so a
--      definer RPC is the only way the client can see the partner's state).

-- ============================================================
-- 1. accept_challenge_invite — light both partners' fires.
-- ============================================================
create or replace function public.accept_challenge_invite(p_token text)
returns uuid
language plpgsql
security definer
as $$
declare
  v_invite_id uuid;
  v_user_challenge_id uuid;
  v_invited_by uuid;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select id, user_challenge_id, invited_by
    into v_invite_id, v_user_challenge_id, v_invited_by
  from public.challenge_invites
  where token = p_token and status = 'pending'
  limit 1;

  if v_invite_id is null then
    raise exception 'invite not found or already used';
  end if;

  if v_invited_by = v_uid then
    raise exception 'you cannot accept your own invite';
  end if;

  update public.challenge_invites
  set status = 'accepted', accepted_by = v_uid, accepted_at = now()
  where id = v_invite_id;

  -- Light the inviter's shared fire. Prefer the challenge the invite was
  -- attached to; fall back to their newest pending partner track for older
  -- invites that were created without a user_challenge_id.
  if v_user_challenge_id is not null then
    update public.user_challenges
    set status = 'active'
    where id = v_user_challenge_id and status = 'pending';
  else
    update public.user_challenges
    set status = 'active'
    where id = (
      select id from public.user_challenges
      where user_id = v_invited_by
        and accountability_mode = 'partner'
        and status = 'pending'
      order by started_at desc
      limit 1
    );
    -- Report back which challenge we lit, for the caller.
    select id into v_user_challenge_id
    from public.user_challenges
    where user_id = v_invited_by
      and accountability_mode = 'partner'
      and status = 'active'
    order by started_at desc
    limit 1;
  end if;

  -- Light the accepter's own partner track so both sides see an active fire.
  update public.user_challenges
  set status = 'active'
  where id = (
    select id from public.user_challenges
    where user_id = v_uid
      and accountability_mode = 'partner'
      and status = 'pending'
    order by started_at desc
    limit 1
  );

  return v_user_challenge_id;
end;
$$;

-- ============================================================
-- 2. get_partner_status — name, avatar, and today's check-in for my partner.
-- ============================================================
create or replace function public.get_partner_status(p_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
as $$
declare
  v_partner_id uuid;
  v_name text;
  v_avatar text;
  v_challenge_id uuid;
  v_total int := 0;
  v_done int := 0;
begin
  -- The partner is the other party on my most recent accepted invite
  -- (whether I sent it or received it).
  select case when invited_by = p_user_id then accepted_by else invited_by end
    into v_partner_id
  from public.challenge_invites
  where status = 'accepted'
    and (invited_by = p_user_id or accepted_by = p_user_id)
  order by accepted_at desc nulls last
  limit 1;

  if v_partner_id is null then
    return jsonb_build_object('linked', false);
  end if;

  select full_name, avatar_url into v_name, v_avatar
  from public.profiles
  where id = v_partner_id;

  select id into v_challenge_id
  from public.user_challenges
  where user_id = v_partner_id
    and accountability_mode = 'partner'
    and status = 'active'
  order by started_at desc
  limit 1;

  if v_challenge_id is not null then
    select count(*) into v_total
    from public.challenge_tasks
    where user_challenge_id = v_challenge_id;

    select count(distinct ct.id) into v_done
    from public.challenge_tasks ct
    join public.task_checkins tc on tc.challenge_task_id = ct.id
    where ct.user_challenge_id = v_challenge_id
      and tc.status = 'completed'
      and (tc.completed_at at time zone 'utc')::date = (now() at time zone 'utc')::date;
  end if;

  return jsonb_build_object(
    'linked', true,
    'partner_id', v_partner_id,
    'name', v_name,
    'avatar_url', v_avatar,
    'total_tasks', v_total,
    'completed_today', v_done,
    'checked_in_today', v_done > 0
  );
end;
$$;

grant execute on function public.accept_challenge_invite(text) to authenticated;
grant execute on function public.get_partner_status(uuid) to authenticated, service_role;
