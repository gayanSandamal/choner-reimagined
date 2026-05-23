create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  age_range text,
  primary_goal text,
  main_struggle text,
  work_type text,
  stress_level text,
  accountability_style text,
  created_at timestamptz not null default now()
);

create table if not exists public.challenge_templates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  category text not null,
  duration_days int not null default 7,
  difficulty text not null default 'beginner',
  summary text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.user_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  template_id uuid not null references public.challenge_templates(id) on delete restrict,
  mode text not null check (mode in ('solo', 'partner', 'group', 'public')),
  status text not null default 'active' check (status in ('active', 'paused', 'completed', 'abandoned')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  current_day int not null default 1
);

create table if not exists public.challenge_checkins (
  id uuid primary key default gen_random_uuid(),
  user_challenge_id uuid not null references public.user_challenges(id) on delete cascade,
  checkin_date date not null,
  status text not null check (status in ('complete', 'partial', 'missed')),
  notes text,
  created_at timestamptz not null default now(),
  unique(user_challenge_id, checkin_date)
);

create table if not exists public.accountability_pairs (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.user_challenges(id) on delete cascade,
  user_a uuid not null references auth.users(id) on delete cascade,
  user_b uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'active', 'ended')),
  created_at timestamptz not null default now()
);

create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  inviter_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  invite_type text not null,
  token text not null unique,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'expired')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.user_challenges enable row level security;
alter table public.challenge_checkins enable row level security;
alter table public.accountability_pairs enable row level security;
alter table public.invites enable row level security;
alter table public.challenge_templates enable row level security;

create policy "profiles are viewable by owner"
on public.profiles for select using (auth.uid() = id);
create policy "profiles are updatable by owner"
on public.profiles for update using (auth.uid() = id);
create policy "profiles insert by owner"
on public.profiles for insert with check (auth.uid() = id);

create policy "templates readable by authenticated users"
on public.challenge_templates for select using (auth.role() = 'authenticated');

create policy "own challenges readable"
on public.user_challenges for select using (auth.uid() = user_id);
create policy "own challenges insertable"
on public.user_challenges for insert with check (auth.uid() = user_id);
create policy "own challenges updatable"
on public.user_challenges for update using (auth.uid() = user_id);

create policy "own checkins readable via challenge"
on public.challenge_checkins for select using (
  exists (
    select 1 from public.user_challenges uc
    where uc.id = user_challenge_id and uc.user_id = auth.uid()
  )
);
create policy "own checkins insertable via challenge"
on public.challenge_checkins for insert with check (
  exists (
    select 1 from public.user_challenges uc
    where uc.id = user_challenge_id and uc.user_id = auth.uid()
  )
);

create policy "own pairs readable"
on public.accountability_pairs for select using (auth.uid() = user_a or auth.uid() = user_b);
create policy "own pairs insertable"
on public.accountability_pairs for insert with check (auth.uid() = user_a);

create policy "own invites readable"
on public.invites for select using (auth.uid() = inviter_id);
create policy "own invites insertable"
on public.invites for insert with check (auth.uid() = inviter_id);

insert into public.challenge_templates (title, slug, category, duration_days, difficulty, summary)
values
('7-Day Energy Reset', '7-day-energy-reset', 'energy', 7, 'beginner', 'Daily steps, hydration, and better wind-down timing.'),
('Sleep Better Sprint', 'sleep-better-sprint', 'sleep', 10, 'beginner', 'Improve your sleep rhythm with realistic nightly goals.'),
('Consistency Builder', 'consistency-builder', 'consistency', 14, 'intermediate', 'A foundation challenge for people who start and stop routines.');
