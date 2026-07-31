-- Partner invite acceptance: fix the new-invitee race and make accept idempotent.
--
-- Observed 2026-07-28 with a real invitee (accepted 10:00:09.408, their
-- user_challenges rows created 10:00:09.576 — 170ms LATER):
--
--   1. accept_challenge_invite flipped the invite to 'accepted' and lit the
--      inviter's track, then tried to activate the accepter's partner track.
--      For a brand-new account those rows did not exist yet, so that UPDATE
--      matched zero rows and the accepter was never joined to the challenge.
--   2. Because the invite was already 'accepted', every retry raised
--      'invite not found or already used' — a dead end with no way to heal.
--      The pair only linked because a SECOND invite was sent minutes later.
--
-- Fixes here:
--   * Re-accepting your OWN already-accepted invite is now idempotent: it
--     re-runs the linking instead of erroring, which heals a partial accept.
--   * The accepter's tracks are provisioned via ensure_default_challenges
--     before activation, so acceptance no longer depends on onboarding having
--     already created them.
--   * The accepter is seeded with the INVITER's template, so both partners
--     are actually on the same challenge rather than whatever default won.

create or replace function public.accept_challenge_invite(p_token text)
returns uuid
language plpgsql
security definer
as $$
declare
  v_invite_id uuid;
  v_user_challenge_id uuid;
  v_invited_by uuid;
  v_status text;
  v_accepted_by uuid;
  v_template_id uuid;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  -- Fetch regardless of status so an already-accepted invite can be healed
  -- rather than dead-ending the accepter.
  select id, user_challenge_id, invited_by, status, accepted_by
    into v_invite_id, v_user_challenge_id, v_invited_by, v_status, v_accepted_by
  from public.challenge_invites
  where token = p_token
  limit 1;

  if v_invite_id is null then
    raise exception 'invite not found';
  end if;

  if v_invited_by = v_uid then
    raise exception 'you cannot accept your own invite';
  end if;

  if v_status = 'pending' then
    update public.challenge_invites
    set status = 'accepted', accepted_by = v_uid, accepted_at = now()
    where id = v_invite_id;
  elsif v_status = 'accepted' and v_accepted_by = v_uid then
    -- Same user re-running it: fall through and re-link. Safe because every
    -- write below is idempotent.
    null;
  else
    raise exception 'this invite has already been used by someone else';
  end if;

  -- Resolve the inviter's shared fire. Prefer the challenge the invite was
  -- attached to; fall back to their newest partner track for older invites
  -- created without a user_challenge_id.
  if v_user_challenge_id is null then
    select id into v_user_challenge_id
    from public.user_challenges
    where user_id = v_invited_by
      and accountability_mode = 'partner'
      and status in ('pending', 'active')
    order by started_at desc
    limit 1;
  end if;

  update public.user_challenges
  set status = 'active'
  where id = v_user_challenge_id and status = 'pending';

  -- Put the accepter on the SAME challenge the inviter is running.
  select challenge_template_id into v_template_id
  from public.user_challenges
  where id = v_user_challenge_id;

  -- The fix for the race: guarantee the accepter's tracks exist before we try
  -- to activate them. Idempotent, so it is a no-op once onboarding has run.
  perform public.ensure_default_challenges(v_uid, v_template_id, v_template_id);

  update public.user_challenges
  set status = 'active'
  where id = (
    select id from public.user_challenges
    where user_id = v_uid
      and accountability_mode = 'partner'
      and status in ('pending', 'active')
    order by started_at desc
    limit 1
  );

  return v_user_challenge_id;
end;
$$;

grant execute on function public.accept_challenge_invite(text) to authenticated;
