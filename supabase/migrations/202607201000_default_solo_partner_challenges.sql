-- Every user keeps two default challenges side by side:
--   1. Solo    — accountability_mode='solo',    status='active'  (always burning)
--   2. Partner — accountability_mode='partner', status='pending' until a
--                partner accepts the invite, then it flips to 'active'.
--
-- 'pending' is a new status value. Keeping the partner track 'pending' means
-- there is still exactly ONE 'active' row per user until a partner joins, so
-- existing single-active-challenge queries keep working.

-- ============================================================
-- 1. Allow 'pending' on user_challenges.status
--    The initial constraint is unnamed; find and drop it, then add a named one.
-- ============================================================
do $$
declare
  v_conname text;
begin
  select con.conname into v_conname
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace nsp on nsp.oid = rel.relnamespace
  where nsp.nspname = 'public'
    and rel.relname = 'user_challenges'
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) ilike '%status%'
  limit 1;

  if v_conname is not null then
    execute format('alter table public.user_challenges drop constraint %I', v_conname);
  end if;
end $$;

alter table public.user_challenges
  add constraint user_challenges_status_check
  check (status in ('pending', 'active', 'paused', 'completed', 'abandoned'));

-- ============================================================
-- 2. ensure_default_challenges — idempotent provisioning of both tracks.
--    When a template id is omitted for one track, it mirrors the other so
--    Solo and Partner share the same habit by default.
-- ============================================================
create or replace function public.ensure_default_challenges(
  p_user_id uuid,
  p_solo_template_id uuid default null,
  p_partner_template_id uuid default null
) returns void
language plpgsql
security definer
as $$
declare
  v_solo_exists boolean;
  v_partner_exists boolean;
  v_default_template uuid;
  v_solo_tmpl uuid;
  v_partner_tmpl uuid;
  v_id uuid;
  v_title text;
begin
  select exists(
    select 1 from public.user_challenges
    where user_id = p_user_id and accountability_mode = 'solo'
      and status in ('active', 'pending', 'paused')
  ) into v_solo_exists;

  select exists(
    select 1 from public.user_challenges
    where user_id = p_user_id and accountability_mode = 'partner'
      and status in ('active', 'pending', 'paused')
  ) into v_partner_exists;

  -- Fallback when the caller passes no template at all.
  select id into v_default_template
  from public.challenge_templates
  order by sort_order, created_at
  limit 1;

  v_solo_tmpl := coalesce(p_solo_template_id, p_partner_template_id, v_default_template);
  v_partner_tmpl := coalesce(p_partner_template_id, p_solo_template_id, v_default_template);

  if not v_solo_exists and v_solo_tmpl is not null then
    insert into public.user_challenges(user_id, challenge_template_id, accountability_mode, status, ends_at)
    values (p_user_id, v_solo_tmpl, 'solo', 'active', now() + interval '7 days')
    returning id into v_id;

    select title into v_title from public.challenge_templates where id = v_solo_tmpl;
    insert into public.challenge_tasks(user_challenge_id, title, sort_order, due_window)
    values (v_id, coalesce(v_title, 'Complete today''s habit'), 1, 'anytime');
  end if;

  if not v_partner_exists and v_partner_tmpl is not null then
    insert into public.user_challenges(user_id, challenge_template_id, accountability_mode, status, ends_at)
    values (p_user_id, v_partner_tmpl, 'partner', 'pending', now() + interval '7 days')
    returning id into v_id;

    select title into v_title from public.challenge_templates where id = v_partner_tmpl;
    insert into public.challenge_tasks(user_challenge_id, title, sort_order, due_window)
    values (v_id, coalesce(v_title, 'Complete today''s habit'), 1, 'anytime');
  end if;
end;
$$;

-- ============================================================
-- 3. Accepting a partner invite activates the partner challenge.
-- ============================================================
create or replace function public.accept_challenge_invite(p_token text)
returns uuid
language plpgsql
security definer
as $$
declare
  v_invite_id uuid;
  v_user_challenge_id uuid;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select id, user_challenge_id into v_invite_id, v_user_challenge_id
  from public.challenge_invites
  where token = p_token and status = 'pending'
  limit 1;

  if v_invite_id is null then
    raise exception 'invite not found or already used';
  end if;

  update public.challenge_invites
  set status = 'accepted', accepted_by = v_uid, accepted_at = now()
  where id = v_invite_id;

  -- The partner has joined — light the shared fire.
  update public.user_challenges
  set status = 'active'
  where id = v_user_challenge_id and status = 'pending';

  return v_user_challenge_id;
end;
$$;

-- ============================================================
-- 4. Backfill: give every onboarded user both tracks, reusing whatever
--    challenge (and template) they already have.
-- ============================================================
do $$
declare
  r record;
begin
  for r in
    select
      p.id as uid,
      (
        select uc.challenge_template_id
        from public.user_challenges uc
        where uc.user_id = p.id and uc.status in ('active', 'pending', 'paused')
        order by uc.started_at
        limit 1
      ) as tmpl
    from public.profiles p
    where coalesce(p.onboarding_complete, false) = true
  loop
    perform public.ensure_default_challenges(r.uid, r.tmpl, r.tmpl);
  end loop;
end $$;
