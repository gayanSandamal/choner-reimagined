-- Only the partner "viewing" a photo should start its countdown to deletion -
-- the owner looking at their own check-in must never trigger this, and a
-- stranger obviously never gets the chance (task_checkins has no direct
-- select policy for non-owners at all; this is reached only through the
-- security-definer RPCs, same as get_partner_status/get_pair_checkins).
create or replace function public.mark_checkin_photo_viewed(p_checkin_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_owner uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select uc.user_id into v_owner
  from public.task_checkins tc
  join public.user_challenges uc on uc.id = tc.user_challenge_id
  where tc.id = p_checkin_id;

  if v_owner is null then
    raise exception 'checkin not found';
  end if;

  -- The owner opening their own history is not a "view" for this purpose.
  if v_owner = v_uid then
    return;
  end if;

  if not public.is_partner_of(v_uid, v_owner) then
    raise exception 'not your partner''s checkin';
  end if;

  -- Idempotent: the first view is the one that counts, so a second call (or a
  -- retry) never resets the clock.
  update public.task_checkins
  set photo_viewed_at = coalesce(photo_viewed_at, now())
  where id = p_checkin_id;
end;
$$;

grant execute on function public.mark_checkin_photo_viewed(uuid) to authenticated;
