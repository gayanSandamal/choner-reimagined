-- Challenge Setup Flow (Aug 2026 spec): the curated Step 1 list, the
-- "Create your own" fallback, and the Step 2 "Why" reflection.
--
-- Four things happen here:
--   1. challenge_templates gains is_active, so a habit can be retired from the
--      picker without deleting a row real users are already running (the FK is
--      on delete restrict, so deleting is not an option anyway).
--   2. The spec's curated options are seeded — 12 habits across the four
--      Screen 2 goals, replacing the four onboarding placeholders.
--   3. user_challenges gains custom_habit_title for "Create your own".
--      Templates are global and read by everyone, so a user's own habit text
--      must not go in there — it would show up in every other user's Quests
--      list.
--   4. challenge_reflections stores each user's four "Why" answers. These are
--      deliberately owner-only: the spec is explicit that a partner never sees
--      them, so there is no partner policy and no security-definer read.

-- ============================================================
-- 1. is_active — retire a template without deleting it
-- ============================================================
alter table public.challenge_templates
  add column if not exists is_active boolean not null default true;

-- "No screens 30 minutes before bed" is cut by the spec: there is no reliable
-- way to verify it. Existing challenges on it keep working; it just stops
-- being offered.
update public.challenge_templates
set is_active = false
where slug = 'onboarding-no-screens';

-- ============================================================
-- 2. The curated Step 1 options
--
-- proof_type follows the rule already established in
-- 202607311100_proof_type_and_photo_checkins.sql: 'photo' only where there is
-- a real physical artifact to photograph, 'tap' otherwise. Journaling is
-- 'tap' on purpose — the page exists, but asking someone to photograph what
-- they just wrote makes a private habit feel surveilled.
-- ============================================================
insert into public.challenge_templates
  (title, slug, category, duration_days, difficulty, summary, description, sort_order, proof_type)
values
  -- Move more
  ('Run 1 mile', 'onboarding-run-1-mile', 'movement', 7, 'intermediate',
   'One mile a day, at whatever pace you have.',
   'One mile a day, at whatever pace you have.', 11, 'photo'),
  ('20 push-ups', 'onboarding-pushups-20', 'movement', 7, 'beginner',
   'Twenty push-ups, broken into as many sets as you need.',
   'Twenty push-ups, broken into as many sets as you need.', 12, 'photo'),
  ('Yoga session (15 min)', 'onboarding-yoga-15min', 'movement', 7, 'beginner',
   'Fifteen minutes on the mat to move and reset.',
   'Fifteen minutes on the mat to move and reset.', 13, 'photo'),
  -- Sleep better
  ('10-min wind-down walk', 'onboarding-winddown-walk', 'sleep', 7, 'beginner',
   'A short walk in the evening to settle before bed.',
   'A short walk in the evening to settle before bed.', 21, 'photo'),
  ('Stretch before bed (5 min)', 'onboarding-stretch-before-bed', 'sleep', 7, 'beginner',
   'Five minutes of stretching to unwind your body for sleep.',
   'Five minutes of stretching to unwind your body for sleep.', 22, 'photo'),
  -- Reduce stress
  ('Journaling', 'onboarding-journaling', 'stress', 7, 'beginner',
   'Put the day on paper so it stops circling in your head.',
   'Put the day on paper so it stops circling in your head.', 32, 'tap'),
  ('Short walk outside', 'onboarding-walk-outside', 'stress', 7, 'beginner',
   'Step outside and let your head clear.',
   'Step outside and let your head clear.', 33, 'photo'),
  -- Improve energy
  ('Morning stretch', 'onboarding-morning-stretch', 'energy', 7, 'beginner',
   'Wake your body up before the day takes over.',
   'Wake your body up before the day takes over.', 42, 'photo'),
  ('No caffeine after 2pm', 'onboarding-no-caffeine-2pm', 'energy', 7, 'beginner',
   'Protect tonight''s sleep by cutting off caffeine early.',
   'Protect tonight''s sleep by cutting off caffeine early.', 43, 'tap')
on conflict (slug) do nothing;

-- The backing template for "Create your own". It is never listed anywhere —
-- is_active=false keeps it out of both the Quests tab and the picker — but a
-- user_challenges row still needs a template to point at, and every column
-- except the title comes from here. proof_type is 'tap' because we cannot know
-- whether an arbitrary habit someone types has anything to photograph.
insert into public.challenge_templates
  (title, slug, category, duration_days, difficulty, summary, description, sort_order, proof_type, is_active)
values
  ('Your own habit', 'custom-habit', 'custom', 7, 'beginner',
   'A habit you set for yourself.',
   'A habit you set for yourself.', 99, 'tap', false)
on conflict (slug) do nothing;

-- Keep the four originals ordered ahead of their new siblings.
update public.challenge_templates set sort_order = 10 where slug = 'onboarding-walk-10min';
update public.challenge_templates set sort_order = 31 where slug = 'onboarding-deep-breathing';
update public.challenge_templates set sort_order = 41 where slug = 'onboarding-morning-water';

-- ============================================================
-- 3. custom_habit_title — "Create your own"
--
-- Null means "use the template's title", which is every existing row.
-- challenge_tasks.title is already a per-challenge copy, so the habit the user
-- actually logs against needs no special handling once it is set correctly at
-- creation time.
-- ============================================================
alter table public.user_challenges
  add column if not exists custom_habit_title text;

-- ============================================================
-- 4. challenge_reflections — the four "Why" answers
--
-- Scoped to the user, not to a single user_challenges row. Every user has TWO
-- live rows (solo + partner) sharing one habit, so per-row storage would mean
-- writing the same four answers twice and keeping them in sync forever.
-- user_challenge_id is kept, nullable, so a future multi-challenge world can
-- scope answers per challenge without a rewrite.
-- ============================================================
create table if not exists public.challenge_reflections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  user_challenge_id uuid references public.user_challenges(id) on delete set null,
  question_key text not null check (question_key in ('purpose', 'matters', 'gain', 'lose')),
  -- The chosen quick-select option. Null when the user picked "Something else"
  -- and only typed their own.
  choice_key text,
  custom_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, question_key)
);

create index if not exists challenge_reflections_user_idx
  on public.challenge_reflections (user_id);

alter table public.challenge_reflections enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'challenge_reflections' and policyname = 'challenge_reflections_own_select') then
    create policy challenge_reflections_own_select on public.challenge_reflections
      for select using (user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where tablename = 'challenge_reflections' and policyname = 'challenge_reflections_own_insert') then
    create policy challenge_reflections_own_insert on public.challenge_reflections
      for insert with check (user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where tablename = 'challenge_reflections' and policyname = 'challenge_reflections_own_update') then
    create policy challenge_reflections_own_update on public.challenge_reflections
      for update using (user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where tablename = 'challenge_reflections' and policyname = 'challenge_reflections_own_delete') then
    create policy challenge_reflections_own_delete on public.challenge_reflections
      for delete using (user_id = auth.uid());
  end if;
end $$;

-- ============================================================
-- 5. Provisioning RPCs carry the custom title through
--
-- The old three-argument signatures are DROPPED rather than replaced: adding a
-- defaulted fourth parameter with create-or-replace would leave two functions
-- behind, and a three-argument call would then fail as ambiguous.
-- ============================================================
drop function if exists public.start_user_challenge(uuid, uuid, text);

create or replace function public.start_user_challenge(
  p_user_id uuid,
  p_template_id uuid,
  p_accountability_mode text,
  p_custom_habit_title text default null
) returns uuid
language plpgsql
security definer
as $$
declare
  v_user_challenge_id uuid;
  v_title text;
begin
  insert into public.user_challenges(
    user_id, challenge_template_id, accountability_mode, status, ends_at, custom_habit_title)
  values (
    p_user_id, p_template_id, p_accountability_mode, 'active', now() + interval '7 days',
    nullif(btrim(coalesce(p_custom_habit_title, '')), ''))
  returning id into v_user_challenge_id;

  select title into v_title from public.challenge_templates where id = p_template_id;

  insert into public.challenge_tasks(user_challenge_id, title, sort_order, due_window)
  values (
    v_user_challenge_id,
    coalesce(nullif(btrim(coalesce(p_custom_habit_title, '')), ''), v_title, 'Complete today''s habit'),
    1,
    'anytime');

  return v_user_challenge_id;
end;
$$;

drop function if exists public.ensure_default_challenges(uuid, uuid, uuid);

create or replace function public.ensure_default_challenges(
  p_user_id uuid,
  p_solo_template_id uuid default null,
  p_partner_template_id uuid default null,
  p_custom_habit_title text default null
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
  v_custom text := nullif(btrim(coalesce(p_custom_habit_title, '')), '');
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

  -- Fallback when the caller passes no template at all. Retired templates are
  -- excluded so a new user can never be seeded onto a habit the picker has
  -- stopped offering.
  select id into v_default_template
  from public.challenge_templates
  where is_active
  order by sort_order, created_at
  limit 1;

  v_solo_tmpl := coalesce(p_solo_template_id, p_partner_template_id, v_default_template);
  v_partner_tmpl := coalesce(p_partner_template_id, p_solo_template_id, v_default_template);

  if not v_solo_exists and v_solo_tmpl is not null then
    insert into public.user_challenges(
      user_id, challenge_template_id, accountability_mode, status, ends_at, custom_habit_title)
    values (p_user_id, v_solo_tmpl, 'solo', 'active', now() + interval '7 days', v_custom)
    returning id into v_id;

    select title into v_title from public.challenge_templates where id = v_solo_tmpl;
    insert into public.challenge_tasks(user_challenge_id, title, sort_order, due_window)
    values (v_id, coalesce(v_custom, v_title, 'Complete today''s habit'), 1, 'anytime');
  end if;

  if not v_partner_exists and v_partner_tmpl is not null then
    insert into public.user_challenges(
      user_id, challenge_template_id, accountability_mode, status, ends_at, custom_habit_title)
    values (p_user_id, v_partner_tmpl, 'partner', 'pending', now() + interval '7 days', v_custom)
    returning id into v_id;

    select title into v_title from public.challenge_templates where id = v_partner_tmpl;
    insert into public.challenge_tasks(user_challenge_id, title, sort_order, due_window)
    values (v_id, coalesce(v_custom, v_title, 'Complete today''s habit'), 1, 'anytime');
  end if;
end;
$$;

-- ============================================================
-- 6. set_challenge_habit — repoint an existing track at a chosen habit
--
-- Onboarding provisions both default tracks before Step 1 runs, so by the time
-- the user actually picks a habit the rows already exist and
-- ensure_default_challenges is a no-op. This applies the choice to a track the
-- caller owns, keeping the logged task title in step with it.
-- ============================================================
create or replace function public.set_challenge_habit(
  p_user_challenge_id uuid,
  p_template_id uuid,
  p_custom_habit_title text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_custom text := nullif(btrim(coalesce(p_custom_habit_title, '')), '');
  v_title text;
  v_owner uuid;
begin
  select user_id into v_owner
  from public.user_challenges
  where id = p_user_challenge_id;

  if v_owner is null then
    raise exception 'challenge not found';
  end if;

  -- security definer: this must never let one user rewrite another's habit.
  if v_owner <> auth.uid() then
    raise exception 'not your challenge';
  end if;

  select title into v_title from public.challenge_templates where id = p_template_id;
  if v_title is null then
    raise exception 'template not found';
  end if;

  update public.user_challenges
  set challenge_template_id = p_template_id,
      custom_habit_title = v_custom
  where id = p_user_challenge_id;

  update public.challenge_tasks
  set title = coalesce(v_custom, v_title)
  where user_challenge_id = p_user_challenge_id;
end;
$$;

-- ============================================================
-- 7. accept_challenge_invite — carry the inviter's custom habit across
--
-- The accepter was already seeded with the inviter's TEMPLATE, but a custom
-- habit lives on the challenge row, not the template. Without this a pair on
-- "30 sit-ups" would have the inviter logging "30 sit-ups" while the partner
-- logged whatever the placeholder template was called.
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
  v_custom_title text;
  v_my_challenge_id uuid;
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

  -- Put the accepter on the SAME challenge the inviter is running — template
  -- and, when they wrote their own, the custom habit text too.
  select challenge_template_id, custom_habit_title
    into v_template_id, v_custom_title
  from public.user_challenges
  where id = v_user_challenge_id;

  perform public.ensure_default_challenges(v_uid, v_template_id, v_template_id, v_custom_title);

  select id into v_my_challenge_id
  from public.user_challenges
  where user_id = v_uid
    and accountability_mode = 'partner'
    and status in ('pending', 'active')
  order by started_at desc
  limit 1;

  update public.user_challenges
  set status = 'active'
  where id = v_my_challenge_id;

  -- Only the PARTNER track is realigned. The accepter's solo track is their
  -- own habit and must not be overwritten by whoever invited them.
  if v_my_challenge_id is not null and v_template_id is not null then
    update public.user_challenges
    set challenge_template_id = v_template_id,
        custom_habit_title = v_custom_title
    where id = v_my_challenge_id;

    update public.challenge_tasks
    set title = coalesce(
      v_custom_title,
      (select title from public.challenge_templates where id = v_template_id),
      title)
    where user_challenge_id = v_my_challenge_id;
  end if;

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

grant execute on function public.start_user_challenge(uuid, uuid, text, text) to authenticated;
grant execute on function public.ensure_default_challenges(uuid, uuid, uuid, text) to authenticated;
grant execute on function public.set_challenge_habit(uuid, uuid, text) to authenticated;
grant execute on function public.accept_challenge_invite(text) to authenticated;

-- Two RPC signatures changed and a table was added. Without this the API keeps
-- serving the old schema cache and every call to the new arguments 404s.
notify pgrst, 'reload schema';
