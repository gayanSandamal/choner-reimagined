-- Find tab + Community milestone feed (All Tabs spec v3).
--
-- Two things the product now needs and the schema has never carried:
--
--   1. A CITY. Find shows it on the request card, Community is an explicitly
--      local feed, and the manual matching heuristic wants rough location so
--      nobody is paired across incompatible time zones. We already store an
--      IANA timezone, and 'Asia/Colombo' already contains the answer, so city
--      is derived rather than asked for -- no new onboarding question.
--
--   2. MILESTONES. The Community feed is opt-in social proof: a pair hits a
--      streak, finishes a challenge, or gets matched, and may choose to share
--      it locally. Nothing appears without that choice.

-- ============================================================
-- 1. profiles.city
--
-- Backfilled from timezone, and kept editable: the derivation is a good guess,
-- not a fact. 'Asia/Colombo' -> 'Colombo', 'America/New_York' -> 'New York'.
-- ============================================================
alter table public.profiles
  add column if not exists city text;

create or replace function public.city_from_timezone(p_timezone text)
returns text
language sql
immutable
as $$
  select nullif(replace(split_part(coalesce(p_timezone, ''), '/', -1), '_', ' '), '');
$$;

update public.profiles
set city = public.city_from_timezone(timezone)
where city is null;

create index if not exists profiles_city_idx on public.profiles (city) where city is not null;

-- ============================================================
-- 2. Milestones
--
-- A milestone belongs to a PAIR, which is why both users are on the row: the
-- feed shows two avatars and two first names.
--
-- `shared` does double duty. A row with shared=false is a milestone the user
-- was offered and declined -- keeping it is what stops the prompt asking again
-- every time they open the app. Only shared=true rows ever reach the feed.
-- ============================================================
create table if not exists public.milestones (
  id uuid primary key default gen_random_uuid(),
  -- The person who was offered the prompt and answered it.
  shared_by uuid not null references auth.users(id) on delete cascade,
  partner_user_id uuid references auth.users(id) on delete set null,
  user_challenge_id uuid references public.user_challenges(id) on delete set null,
  kind text not null check (kind in ('streak', 'complete', 'matched')),
  -- Denormalised on purpose: the feed row must keep reading correctly even
  -- after the challenge ends, the habit is renamed, or the pair splits up.
  habit_title text,
  streak_days int,
  city text,
  shared boolean not null default true,
  created_at timestamptz not null default now()
);

-- One decision per person, per challenge, per kind. The prompt checks for this
-- row's existence, so the conflict target is what makes "don't ask again" work.
create unique index if not exists milestones_one_per_kind
  on public.milestones (shared_by, coalesce(user_challenge_id, '00000000-0000-0000-0000-000000000000'::uuid), kind);

create index if not exists milestones_feed_idx
  on public.milestones (city, created_at desc) where shared;

alter table public.milestones enable row level security;

do $$
begin
  -- The feed is local and opt-in: shared rows from your own city, plus
  -- anything you are personally part of so your own pair card is never blank.
  if not exists (select 1 from pg_policies where tablename = 'milestones' and policyname = 'milestones_local_select') then
    create policy milestones_local_select on public.milestones
      for select using (
        shared_by = auth.uid()
        or partner_user_id = auth.uid()
        or (
          shared
          and city is not null
          and city = (select p.city from public.profiles p where p.id = auth.uid())
        )
      );
  end if;

  -- You can only record your own decision.
  if not exists (select 1 from pg_policies where tablename = 'milestones' and policyname = 'milestones_own_insert') then
    create policy milestones_own_insert on public.milestones
      for insert with check (shared_by = auth.uid());
  end if;

  -- Sharing is revocable. Flipping `shared` to false pulls it from the feed
  -- without re-triggering the prompt.
  if not exists (select 1 from pg_policies where tablename = 'milestones' and policyname = 'milestones_own_update') then
    create policy milestones_own_update on public.milestones
      for update using (shared_by = auth.uid());
  end if;
end $$;

-- ============================================================
-- 3. Reactions — one tap, one emoji, no comments
-- ============================================================
create table if not exists public.milestone_reactions (
  milestone_id uuid not null references public.milestones(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  emoji text not null default '👏',
  created_at timestamptz not null default now(),
  primary key (milestone_id, user_id)
);

alter table public.milestone_reactions enable row level security;

do $$
begin
  -- Readable alongside any milestone you can already see. The subquery leans
  -- on the milestones policy above rather than repeating the city rule.
  if not exists (select 1 from pg_policies where tablename = 'milestone_reactions' and policyname = 'milestone_reactions_select') then
    create policy milestone_reactions_select on public.milestone_reactions
      for select using (
        exists (select 1 from public.milestones m where m.id = milestone_id)
      );
  end if;
  if not exists (select 1 from pg_policies where tablename = 'milestone_reactions' and policyname = 'milestone_reactions_own_insert') then
    create policy milestone_reactions_own_insert on public.milestone_reactions
      for insert with check (user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where tablename = 'milestone_reactions' and policyname = 'milestone_reactions_own_delete') then
    create policy milestone_reactions_own_delete on public.milestone_reactions
      for delete using (user_id = auth.uid());
  end if;
end $$;

-- ============================================================
-- 4. get_city_feed — the Community list in one round trip
--
-- Security definer because the feed needs the OTHER person's first name and
-- avatar, and profiles are not readable across users. Only ever returns first
-- names, never emails or surnames, and only from shared rows in the caller's
-- own city.
-- ============================================================
create or replace function public.get_city_feed(p_limit int default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_city text;
  v_rows jsonb;
begin
  if v_uid is null then
    return jsonb_build_object('city', null, 'items', '[]'::jsonb);
  end if;

  select city into v_city from public.profiles where id = v_uid;

  select coalesce(jsonb_agg(row_to_json(x)::jsonb order by x.created_at desc), '[]'::jsonb)
    into v_rows
  from (
    select
      m.id,
      m.kind,
      m.habit_title,
      m.streak_days,
      m.created_at,
      split_part(coalesce(sp.full_name, 'Someone'), ' ', 1) as sharer_name,
      split_part(coalesce(pp.full_name, ''), ' ', 1) as partner_name,
      sp.avatar_url as sharer_avatar,
      pp.avatar_url as partner_avatar,
      (select count(*) from public.milestone_reactions r where r.milestone_id = m.id) as reactions,
      exists (
        select 1 from public.milestone_reactions r
        where r.milestone_id = m.id and r.user_id = v_uid
      ) as i_reacted
    from public.milestones m
    left join public.profiles sp on sp.id = m.shared_by
    left join public.profiles pp on pp.id = m.partner_user_id
    where m.shared
      and m.city is not null
      and m.city = v_city
    order by m.created_at desc
    limit greatest(1, least(coalesce(p_limit, 30), 100))
  ) x;

  return jsonb_build_object('city', v_city, 'items', v_rows);
end;
$$;

grant execute on function public.city_from_timezone(text) to authenticated;
grant execute on function public.get_city_feed(int) to authenticated;

notify pgrst, 'reload schema';
