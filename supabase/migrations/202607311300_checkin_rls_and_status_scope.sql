-- Three fixes found while verifying photo proof end-to-end.
--
-- 1. task_checkins had ONLY insert + select policies. Undo has therefore been
--    silently failing: the delete matched zero rows under RLS and reported no
--    error. Pre-existing bug, unrelated to photos.
-- 2. No update policy either, which is why attaching a photo after insert
--    silently did nothing. The client now uploads first and inserts the path in
--    one go, but an owner still needs update rights for edits.
-- 3. get_partner_status is security definer and took ANY p_user_id, so any
--    signed-in user could ask for a stranger's partner id, task counts and
--    check-in status. Verified: user C retrieved user A's partner_id. That
--    directly contradicts "only the two people in a pair see this", so the
--    function now refuses to answer for anyone but the caller.

-- ============================================================
-- 1 & 2. Owner update/delete on their own check-ins
-- ============================================================
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'task_checkins' and policyname = 'task_checkins_own_update'
  ) then
    create policy "task_checkins_own_update" on public.task_checkins
      for update to authenticated
      using (
        exists (
          select 1 from public.user_challenges uc
          where uc.id = task_checkins.user_challenge_id and uc.user_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where tablename = 'task_checkins' and policyname = 'task_checkins_own_delete'
  ) then
    create policy "task_checkins_own_delete" on public.task_checkins
      for delete to authenticated
      using (
        exists (
          select 1 from public.user_challenges uc
          where uc.id = task_checkins.user_challenge_id and uc.user_id = auth.uid()
        )
      );
  end if;
end $$;

-- ============================================================
-- 3. Scope get_partner_status to the caller
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
  v_photos jsonb := '[]'::jsonb;
begin
  -- Definer functions bypass RLS, so the argument must be checked explicitly or
  -- it becomes a lookup oracle for any authenticated user. auth.uid() is null
  -- for service-role/back-end callers, which stay trusted.
  if auth.uid() is not null and auth.uid() <> p_user_id then
    return jsonb_build_object('linked', false);
  end if;

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

    select coalesce(jsonb_agg(jsonb_build_object('task_title', ct.title, 'photo_path', tc.photo_path)), '[]'::jsonb)
      into v_photos
    from public.challenge_tasks ct
    join public.task_checkins tc on tc.challenge_task_id = ct.id
    where ct.user_challenge_id = v_challenge_id
      and tc.status = 'completed'
      and tc.photo_path is not null
      and (tc.completed_at at time zone 'utc')::date = (now() at time zone 'utc')::date;
  end if;

  return jsonb_build_object(
    'linked', true,
    'partner_id', v_partner_id,
    'name', v_name,
    'avatar_url', v_avatar,
    'total_tasks', v_total,
    'completed_today', v_done,
    'checked_in_today', v_done > 0,
    'today_photos', v_photos
  );
end;
$$;

grant execute on function public.get_partner_status(uuid) to authenticated, service_role;
