-- Tell the inviter that their partner actually joined.
--
-- Accepting an invite lit both tracks correctly, but nothing informed the
-- inviter. Three separate reasons, all fixed here or alongside:
--
--   1. NO tables were in the supabase_realtime publication, so the realtime
--      subscriptions the app already sets up (notifications, subscriptions)
--      have never delivered a single event. Silently inert.
--   2. accept_challenge_invite sent no notification to the inviter.
--   3. (client side) react-query's focusManager was never wired to AppState,
--      so returning to the app didn't refetch either.

-- ============================================================
-- 1. Let realtime actually broadcast
-- ============================================================
do $$
declare
  t text;
begin
  foreach t in array array['challenge_invites', 'user_challenges', 'notifications']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- Full row on the wire so RLS and column filters evaluate correctly for
-- UPDATEs (default replica identity only carries the primary key).
alter table public.challenge_invites replica identity full;
alter table public.user_challenges replica identity full;

-- ============================================================
-- 2. Notify the inviter on acceptance
-- ============================================================
create or replace function public.accept_challenge_invite(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public, net, extensions
as $$
declare
  v_invite_id uuid;
  v_user_challenge_id uuid;
  v_invited_by uuid;
  v_status text;
  v_accepted_by uuid;
  v_template_id uuid;
  v_uid uuid := auth.uid();
  v_already_accepted boolean := false;
  v_joiner_name text;
  v_key text;
  v_url text;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

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
    -- Idempotent re-accept: re-link, but don't announce the join twice.
    v_already_accepted := true;
  else
    raise exception 'this invite has already been used by someone else';
  end if;

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

  select challenge_template_id into v_template_id
  from public.user_challenges
  where id = v_user_challenge_id;

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

  -- Announce the join. Only on a genuine first acceptance, and never fatal:
  -- a failed notification must not roll back a completed pairing.
  if not v_already_accepted then
    begin
      select value into v_key from public.app_config where key = 'service_role_key';
      select value into v_url from public.app_config where key = 'functions_base_url';
      select coalesce(full_name, 'Your partner') into v_joiner_name
      from public.profiles where id = v_uid;

      if v_key is not null and v_url is not null then
        perform net.http_post(
          url := v_url || '/send-push',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || v_key
          ),
          body := jsonb_build_object(
            'userId', v_invited_by,
            'kind', 'partner_activity',
            'title', split_part(v_joiner_name, ' ', 1) || ' joined your challenge',
            'body', 'Your shared fire is lit — you''re both in.',
            'route', '/(tabs)/home'
          )
        );
      end if;
    exception when others then
      raise notice 'accept_challenge_invite: join notification failed, pairing kept';
    end;
  end if;

  return v_user_challenge_id;
end;
$$;

grant execute on function public.accept_challenge_invite(text) to authenticated;
