-- Let a partner actually see today's proof.
--
-- The storage policy already permits a partner to READ the object, but
-- task_checkins is owner-only under RLS, so the partner has no way to learn the
-- path in the first place. This extends get_partner_status with today's photo
-- paths; the client then mints a signed URL, which the storage policy allows.
--
-- Paths only, never URLs — the bucket is private and signing stays client-side
-- so links are short-lived rather than stored.

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

    -- Today's proof photos, if this habit is photo-verified at all.
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
