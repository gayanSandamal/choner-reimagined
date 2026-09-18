-- Phase 3 — "what number did you reach?" after a check-in.
--
-- Two jobs:
--   1. Record what the user actually achieved, not just that they showed up.
--   2. Redeem the promise made to beginners in the Home prompt — "give us your
--      number after you finish today". The FIRST value a null-capability user
--      records becomes their capability, which is what unblocks stretch-ratio
--      scoring for them in matching.
--
-- completeTask was the one write in this feature that went straight to the
-- table rather than through a security-definer RPC. A value that silently
-- rewrites capability_value needs to be validated server-side, so the insert
-- moves behind log_task_checkin() here.

alter table public.task_checkins
  add column if not exists value numeric;

-- ============================================================
-- log_task_checkin — the insert, now server-side
-- ============================================================
create or replace function public.log_task_checkin(
  p_task_id uuid,
  p_user_challenge_id uuid,
  p_note text default null,
  p_photo_path text default null,
  p_value numeric default null
)
returns public.task_checkins
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_owner uuid;
  v_capability numeric;
  v_row public.task_checkins;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select uc.user_id, uc.capability_value into v_owner, v_capability
  from public.user_challenges uc
  where uc.id = p_user_challenge_id;

  if v_owner is null then
    raise exception 'challenge not found';
  end if;
  if v_owner <> v_uid then
    raise exception 'not your challenge';
  end if;

  -- The task has to belong to this challenge, or a caller could log against
  -- someone else's task by id.
  if not exists (
    select 1 from public.challenge_tasks ct
    where ct.id = p_task_id and ct.user_challenge_id = p_user_challenge_id
  ) then
    raise exception 'task does not belong to this challenge';
  end if;

  if p_value is not null and p_value < 0 then
    raise exception 'value must not be negative';
  end if;

  insert into public.task_checkins
    (challenge_task_id, user_challenge_id, note, photo_path, value, status)
  values
    (p_task_id, p_user_challenge_id, p_note, p_photo_path, p_value, 'completed')
  returning * into v_row;

  -- Backfill capability for a beginner from their first real number. Only
  -- when capability is still null — after that it is theirs to change, not
  -- something a single day's result should overwrite.
  if p_value is not null and v_capability is null then
    update public.user_challenges
    set capability_value = p_value
    where id = p_user_challenge_id and capability_value is null;
  end if;

  return v_row;
end;
$$;

grant execute on function public.log_task_checkin(uuid, uuid, text, text, numeric) to authenticated;

-- ============================================================
-- set_checkin_value — the value arrives after the check-in
--
-- The prompt is shown once the check-in has already landed (the UI must not
-- block the tap on a second question), so the value is a follow-up write.
-- ============================================================
create or replace function public.set_checkin_value(
  p_checkin_id uuid,
  p_value numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_owner uuid;
  v_challenge uuid;
  v_capability numeric;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  if p_value is null or p_value < 0 then
    raise exception 'value must not be negative';
  end if;

  select uc.user_id, uc.id, uc.capability_value
  into v_owner, v_challenge, v_capability
  from public.task_checkins tc
  join public.user_challenges uc on uc.id = tc.user_challenge_id
  where tc.id = p_checkin_id;

  if v_owner is null then
    raise exception 'check-in not found';
  end if;
  if v_owner <> v_uid then
    raise exception 'not your check-in';
  end if;

  update public.task_checkins set value = p_value where id = p_checkin_id;

  if v_capability is null then
    update public.user_challenges
    set capability_value = p_value
    where id = v_challenge and capability_value is null;
  end if;
end;
$$;

grant execute on function public.set_checkin_value(uuid, numeric) to authenticated;
