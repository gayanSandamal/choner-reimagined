-- ============================================================
-- Production data foundation
--   - community: posts, comments, reactions
--   - in-app notifications feed
--   - subscriptions (RevenueCat-backed entitlements)
--   - moderation reports
--   - analytics events mirror
--   - AI coach conversations + messages
--   - hardening on user_devices (push tokens)
--   - real get_user_insights
--   - safer challenge_invites acceptance flow
-- ============================================================

create extension if not exists "pgcrypto";

-- ============================================================
-- 1. Community: posts, comments, reactions
-- ============================================================
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.groups(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists posts_group_created_idx on public.posts (group_id, created_at desc);

create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists post_comments_post_created_idx on public.post_comments (post_id, created_at);

create table if not exists public.post_reactions (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reaction text not null default 'cheer',
  created_at timestamptz not null default now(),
  primary key (post_id, user_id, reaction)
);

alter table public.posts enable row level security;
alter table public.post_comments enable row level security;
alter table public.post_reactions enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'posts' and policyname = 'posts_visible_to_group_or_public') then
    create policy posts_visible_to_group_or_public on public.posts for select using (
      group_id is null or exists (
        select 1 from public.groups g
        where g.id = posts.group_id
          and (g.visibility = 'public' or exists (
            select 1 from public.group_members gm
            where gm.group_id = g.id and gm.user_id = auth.uid()
          ))
      )
    );
  end if;
  if not exists (select 1 from pg_policies where tablename = 'posts' and policyname = 'posts_insert_by_member') then
    create policy posts_insert_by_member on public.posts for insert with check (
      auth.uid() = author_id and (
        group_id is null or exists (
          select 1 from public.group_members gm
          where gm.group_id = posts.group_id and gm.user_id = auth.uid()
        )
      )
    );
  end if;
  if not exists (select 1 from pg_policies where tablename = 'posts' and policyname = 'posts_update_by_author') then
    create policy posts_update_by_author on public.posts for update using (auth.uid() = author_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'posts' and policyname = 'posts_delete_by_author') then
    create policy posts_delete_by_author on public.posts for delete using (auth.uid() = author_id);
  end if;

  if not exists (select 1 from pg_policies where tablename = 'post_comments' and policyname = 'post_comments_visible_with_post') then
    create policy post_comments_visible_with_post on public.post_comments for select using (
      exists (select 1 from public.posts p where p.id = post_comments.post_id)
    );
  end if;
  if not exists (select 1 from pg_policies where tablename = 'post_comments' and policyname = 'post_comments_insert_by_author') then
    create policy post_comments_insert_by_author on public.post_comments for insert with check (auth.uid() = author_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'post_comments' and policyname = 'post_comments_delete_by_author') then
    create policy post_comments_delete_by_author on public.post_comments for delete using (auth.uid() = author_id);
  end if;

  if not exists (select 1 from pg_policies where tablename = 'post_reactions' and policyname = 'post_reactions_visible_with_post') then
    create policy post_reactions_visible_with_post on public.post_reactions for select using (
      exists (select 1 from public.posts p where p.id = post_reactions.post_id)
    );
  end if;
  if not exists (select 1 from pg_policies where tablename = 'post_reactions' and policyname = 'post_reactions_insert_self') then
    create policy post_reactions_insert_self on public.post_reactions for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'post_reactions' and policyname = 'post_reactions_delete_self') then
    create policy post_reactions_delete_self on public.post_reactions for delete using (auth.uid() = user_id);
  end if;
end $$;

-- ============================================================
-- 2. In-app notifications feed
-- ============================================================
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  title text not null,
  body text,
  data jsonb default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_created_idx on public.notifications (user_id, created_at desc);
create index if not exists notifications_user_unread_idx on public.notifications (user_id) where read_at is null;

alter table public.notifications enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'notifications' and policyname = 'notifications_own_select') then
    create policy notifications_own_select on public.notifications for select using (user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where tablename = 'notifications' and policyname = 'notifications_own_update') then
    create policy notifications_own_update on public.notifications for update using (user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where tablename = 'notifications' and policyname = 'notifications_own_delete') then
    create policy notifications_own_delete on public.notifications for delete using (user_id = auth.uid());
  end if;
end $$;

-- ============================================================
-- 3. Subscriptions / premium entitlements
--    RevenueCat is the source of truth, webhook upserts rows here.
-- ============================================================
create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  revenuecat_user_id text,
  entitlement text not null default 'premium',
  status text not null default 'inactive' check (status in ('active', 'in_grace_period', 'in_billing_retry', 'paused', 'inactive', 'expired')),
  product_id text,
  store text check (store in ('app_store', 'play_store', 'stripe', 'promotional')),
  original_purchase_at timestamptz,
  expires_at timestamptz,
  will_renew boolean default false,
  updated_at timestamptz not null default now()
);
create index if not exists subscriptions_active_idx on public.subscriptions (user_id) where status = 'active';

alter table public.subscriptions enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'subscriptions' and policyname = 'subscriptions_own_select') then
    create policy subscriptions_own_select on public.subscriptions for select using (user_id = auth.uid());
  end if;
  -- writes only happen via service-role from the RevenueCat webhook; no insert/update policies for anon/auth.
end $$;

create or replace function public.is_premium(p_user_id uuid)
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1 from public.subscriptions s
    where s.user_id = p_user_id
      and s.status in ('active', 'in_grace_period')
      and (s.expires_at is null or s.expires_at > now())
  );
$$;

-- ============================================================
-- 4. Moderation reports
-- ============================================================
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  target_kind text not null check (target_kind in ('post', 'comment', 'profile', 'group')),
  target_id uuid not null,
  reason text not null,
  details text,
  status text not null default 'open' check (status in ('open', 'reviewed', 'actioned', 'dismissed')),
  created_at timestamptz not null default now()
);
create index if not exists reports_target_idx on public.reports (target_kind, target_id);

alter table public.reports enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'reports' and policyname = 'reports_own_select') then
    create policy reports_own_select on public.reports for select using (reporter_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where tablename = 'reports' and policyname = 'reports_own_insert') then
    create policy reports_own_insert on public.reports for insert with check (reporter_id = auth.uid());
  end if;
end $$;

-- ============================================================
-- 5. Analytics events
-- ============================================================
create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  props jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists analytics_events_name_idx on public.analytics_events (name, created_at desc);
create index if not exists analytics_events_user_idx on public.analytics_events (user_id, created_at desc);

alter table public.analytics_events enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'analytics_events' and policyname = 'analytics_events_own_insert') then
    create policy analytics_events_own_insert on public.analytics_events for insert with check (user_id = auth.uid());
  end if;
end $$;

-- ============================================================
-- 6. AI coach: conversations + messages
-- ============================================================
create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);
create index if not exists ai_conversations_user_idx on public.ai_conversations (user_id, last_message_at desc);

create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('system', 'user', 'assistant')),
  content text not null,
  tokens_in int,
  tokens_out int,
  created_at timestamptz not null default now()
);
create index if not exists ai_messages_conv_idx on public.ai_messages (conversation_id, created_at);
create index if not exists ai_messages_user_day_idx on public.ai_messages (user_id, created_at desc);

alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'ai_conversations' and policyname = 'ai_conversations_own') then
    create policy ai_conversations_own on public.ai_conversations for all using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where tablename = 'ai_messages' and policyname = 'ai_messages_own_select') then
    create policy ai_messages_own_select on public.ai_messages for select using (user_id = auth.uid());
  end if;
  -- inserts to ai_messages happen from the edge function with service role.
end $$;

-- ============================================================
-- 7. Harden user_devices (push tokens)
--    add platform default, last_seen_at, unique (user_id, expo_push_token)
-- ============================================================
alter table if exists public.user_devices
  add column if not exists last_seen_at timestamptz default now();

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'user_devices_user_token_unique'
  ) then
    alter table public.user_devices
      add constraint user_devices_user_token_unique unique (user_id, expo_push_token);
  end if;
end $$;

-- group_members: allow members to see other members of their groups
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'group_members' and policyname = 'group_members_visible_to_group_members') then
    create policy group_members_visible_to_group_members on public.group_members for select using (
      exists (
        select 1 from public.group_members gm
        where gm.group_id = group_members.group_id and gm.user_id = auth.uid()
      )
    );
  end if;
  if not exists (select 1 from pg_policies where tablename = 'group_members' and policyname = 'group_members_insert_self') then
    create policy group_members_insert_self on public.group_members for insert with check (user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where tablename = 'group_members' and policyname = 'group_members_delete_self') then
    create policy group_members_delete_self on public.group_members for delete using (user_id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where tablename = 'groups' and policyname = 'groups_insert_by_authenticated') then
    create policy groups_insert_by_authenticated on public.groups for insert with check (auth.uid() = created_by);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'groups' and policyname = 'groups_update_by_creator') then
    create policy groups_update_by_creator on public.groups for update using (auth.uid() = created_by);
  end if;
end $$;

-- ============================================================
-- 8. Token-based invite acceptance (replace email-based RLS pattern)
-- ============================================================
alter table if exists public.challenge_invites
  add column if not exists token text unique default encode(gen_random_bytes(18), 'hex'),
  add column if not exists accepted_by uuid references auth.users(id) on delete set null,
  add column if not exists accepted_at timestamptz;

-- drop the unsafe email-based policy if it exists; replace with inviter-only select
do $$ begin
  if exists (select 1 from pg_policies where tablename = 'challenge_invites' and policyname = 'challenge_invites_owner_or_recipient') then
    drop policy challenge_invites_owner_or_recipient on public.challenge_invites;
  end if;
  if not exists (select 1 from pg_policies where tablename = 'challenge_invites' and policyname = 'challenge_invites_inviter_select') then
    create policy challenge_invites_inviter_select on public.challenge_invites for select using (invited_by = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where tablename = 'challenge_invites' and policyname = 'challenge_invites_inviter_insert') then
    create policy challenge_invites_inviter_insert on public.challenge_invites for insert with check (invited_by = auth.uid());
  end if;
end $$;

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

  return v_user_challenge_id;
end;
$$;

-- ============================================================
-- 9. Real insights RPC
-- ============================================================
create or replace function public.get_user_insights(p_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
as $$
declare
  v_completion_rate int;
  v_streak int := 0;
  v_best_time text;
  v_consistency int;
  v_day date;
  v_done boolean;
begin
  -- completion rate over last 30 days = checkins / (active days)
  select coalesce(
    round(100.0 * count(distinct date_trunc('day', tc.completed_at))::numeric
      / nullif(greatest(1, least(30, extract(day from (now() - min(uc.started_at)))::int)), 0)
    , 0)::int, 0)
  into v_completion_rate
  from public.user_challenges uc
  left join public.task_checkins tc on tc.user_challenge_id = uc.id
    and tc.completed_at >= now() - interval '30 days'
  where uc.user_id = p_user_id;

  -- streak: walk back day-by-day while at least one checkin existed
  v_day := current_date;
  loop
    select exists (
      select 1 from public.task_checkins tc
      join public.user_challenges uc on uc.id = tc.user_challenge_id
      where uc.user_id = p_user_id and tc.completed_at::date = v_day
    ) into v_done;
    exit when not v_done;
    v_streak := v_streak + 1;
    v_day := v_day - 1;
  end loop;

  -- best time of day: bucket completed_at hours
  select case
           when h between 5 and 11 then 'morning'
           when h between 12 and 16 then 'afternoon'
           when h between 17 and 21 then 'evening'
           else 'late night'
         end
  into v_best_time
  from (
    select extract(hour from tc.completed_at)::int as h, count(*) as c
    from public.task_checkins tc
    join public.user_challenges uc on uc.id = tc.user_challenge_id
    where uc.user_id = p_user_id
      and tc.completed_at >= now() - interval '60 days'
    group by 1
    order by c desc
    limit 1
  ) t;

  -- consistency = completion_rate weighted by streak presence
  v_consistency := least(100, greatest(0, coalesce(v_completion_rate, 0) + least(20, v_streak * 2)));

  return jsonb_build_object(
    'consistency_score', v_consistency,
    'best_time_of_day', coalesce(v_best_time, 'morning'),
    'streak_days', v_streak,
    'completion_rate', coalesce(v_completion_rate, 0)
  );
end;
$$;

-- weekly consistency series for charts
create or replace function public.get_user_insights_series(p_user_id uuid, p_days int default 30)
returns table(day date, completions int)
language sql
stable
security definer
as $$
  with days as (
    select generate_series(current_date - (p_days - 1), current_date, interval '1 day')::date as day
  )
  select d.day,
         coalesce(count(tc.*), 0)::int as completions
  from days d
  left join public.task_checkins tc
    on tc.completed_at::date = d.day
    and tc.user_challenge_id in (
      select id from public.user_challenges where user_id = p_user_id
    )
  group by d.day
  order by d.day;
$$;

-- ============================================================
-- 10. Account deletion RPC (App Store requirement)
-- ============================================================
create or replace function public.delete_account()
returns void
language plpgsql
security definer
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  delete from auth.users where id = v_uid;
end;
$$;
