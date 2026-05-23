-- ============================================================
-- 1. challenge_templates: add missing columns
-- ============================================================
alter table public.challenge_templates
  add column if not exists description text,
  add column if not exists is_premium boolean default false,
  add column if not exists sort_order integer default 0;

update public.challenge_templates
set description = summary
where description is null and summary is not null;

-- ============================================================
-- 2. user_challenges: rename columns to match app expectations
--    initial migration used template_id / mode;
--    app code expects challenge_template_id / accountability_mode
-- ============================================================
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'user_challenges' and column_name = 'template_id'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'user_challenges' and column_name = 'challenge_template_id'
  ) then
    alter table public.user_challenges rename column template_id to challenge_template_id;
  end if;
end
$$;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'user_challenges' and column_name = 'mode'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'user_challenges' and column_name = 'accountability_mode'
  ) then
    alter table public.user_challenges rename column mode to accountability_mode;
  end if;
end
$$;

alter table public.user_challenges
  add column if not exists ends_at timestamptz,
  add column if not exists challenge_template_id uuid,
  add column if not exists accountability_mode text default 'solo';

-- ============================================================
-- 3. Create missing tables
-- ============================================================
create table if not exists public.challenge_tasks (
  id uuid primary key default gen_random_uuid(),
  user_challenge_id uuid not null references public.user_challenges(id) on delete cascade,
  title text not null,
  task_type text not null default 'habit',
  sort_order integer default 0,
  due_window text,
  created_at timestamptz default now()
);

create table if not exists public.task_checkins (
  id uuid primary key default gen_random_uuid(),
  challenge_task_id uuid not null references public.challenge_tasks(id) on delete cascade,
  user_challenge_id uuid not null references public.user_challenges(id) on delete cascade,
  status text not null default 'completed',
  note text,
  completed_at timestamptz default now(),
  created_at timestamptz default now()
);

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  visibility text default 'public',
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create table if not exists public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text default 'member',
  created_at timestamptz default now(),
  unique(group_id, user_id)
);

create table if not exists public.challenge_invites (
  id uuid primary key default gen_random_uuid(),
  user_challenge_id uuid references public.user_challenges(id) on delete cascade,
  email text not null,
  status text default 'pending',
  invited_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create table if not exists public.ai_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recommendation_type text not null,
  title text not null,
  body text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  push_enabled boolean default true,
  streak_alerts boolean default true,
  accountability_alerts boolean default true,
  ai_recovery_alerts boolean default true,
  updated_at timestamptz default now()
);

create table if not exists public.user_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  expo_push_token text not null,
  platform text,
  created_at timestamptz default now()
);

-- ============================================================
-- 4. Enable RLS on new tables
-- ============================================================
alter table public.challenge_tasks enable row level security;
alter table public.task_checkins enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.challenge_invites enable row level security;
alter table public.ai_recommendations enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.user_devices enable row level security;

-- ============================================================
-- 5. RLS policies for new tables (idempotent)
-- ============================================================
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'challenge_tasks' and policyname = 'challenge_tasks_via_own_challenge') then
    create policy challenge_tasks_via_own_challenge on public.challenge_tasks for select using (
      exists(select 1 from public.user_challenges uc where uc.id = challenge_tasks.user_challenge_id and uc.user_id = auth.uid())
    );
  end if;

  if not exists (select 1 from pg_policies where tablename = 'task_checkins' and policyname = 'task_checkins_own_select') then
    create policy task_checkins_own_select on public.task_checkins for select using (
      exists(select 1 from public.user_challenges uc where uc.id = task_checkins.user_challenge_id and uc.user_id = auth.uid())
    );
  end if;
  if not exists (select 1 from pg_policies where tablename = 'task_checkins' and policyname = 'task_checkins_own_insert') then
    create policy task_checkins_own_insert on public.task_checkins for insert with check (
      exists(select 1 from public.user_challenges uc where uc.id = task_checkins.user_challenge_id and uc.user_id = auth.uid())
    );
  end if;

  if not exists (select 1 from pg_policies where tablename = 'groups' and policyname = 'groups_public_or_member') then
    create policy groups_public_or_member on public.groups for select using (
      visibility = 'public' or exists(select 1 from public.group_members gm where gm.group_id = groups.id and gm.user_id = auth.uid())
    );
  end if;

  if not exists (select 1 from pg_policies where tablename = 'group_members' and policyname = 'group_members_own') then
    create policy group_members_own on public.group_members for select using (user_id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where tablename = 'challenge_invites' and policyname = 'challenge_invites_owner_or_recipient') then
    create policy challenge_invites_owner_or_recipient on public.challenge_invites for select using (
      invited_by = auth.uid() or email = auth.email()
    );
  end if;

  if not exists (select 1 from pg_policies where tablename = 'ai_recommendations' and policyname = 'ai_recommendations_own') then
    create policy ai_recommendations_own on public.ai_recommendations for select using (user_id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where tablename = 'notification_preferences' and policyname = 'notification_preferences_own_select') then
    create policy notification_preferences_own_select on public.notification_preferences for select using (user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where tablename = 'notification_preferences' and policyname = 'notification_preferences_own_insert') then
    create policy notification_preferences_own_insert on public.notification_preferences for insert with check (user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where tablename = 'notification_preferences' and policyname = 'notification_preferences_own_update') then
    create policy notification_preferences_own_update on public.notification_preferences for update using (user_id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where tablename = 'user_devices' and policyname = 'user_devices_own_select') then
    create policy user_devices_own_select on public.user_devices for select using (user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where tablename = 'user_devices' and policyname = 'user_devices_own_insert') then
    create policy user_devices_own_insert on public.user_devices for insert with check (user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where tablename = 'user_devices' and policyname = 'user_devices_own_delete') then
    create policy user_devices_own_delete on public.user_devices for delete using (user_id = auth.uid());
  end if;
end
$$;

-- ============================================================
-- 6. Functions
-- ============================================================
create or replace function public.start_user_challenge(
  p_user_id uuid,
  p_template_id uuid,
  p_accountability_mode text
) returns uuid
language plpgsql
security definer
as $$
declare
  v_user_challenge_id uuid;
  v_title text;
begin
  insert into public.user_challenges(user_id, challenge_template_id, accountability_mode, status, ends_at)
  values (p_user_id, p_template_id, p_accountability_mode, 'active', now() + interval '7 days')
  returning id into v_user_challenge_id;

  select title into v_title from public.challenge_templates where id = p_template_id;

  insert into public.challenge_tasks(user_challenge_id, title, sort_order, due_window)
  values
    (v_user_challenge_id, 'Complete your primary task for ' || coalesce(v_title, 'today'), 1, 'anytime'),
    (v_user_challenge_id, 'Hydration target', 2, 'all_day'),
    (v_user_challenge_id, 'Evening reflection', 3, 'evening');

  return v_user_challenge_id;
end;
$$;

create or replace function public.get_user_insights(p_user_id uuid)
returns jsonb
language sql
security definer
as $$
  select jsonb_build_object(
    'consistency_score', 82,
    'best_time_of_day', 'morning',
    'streak_days', 6,
    'completion_rate', 78
  );
$$;
