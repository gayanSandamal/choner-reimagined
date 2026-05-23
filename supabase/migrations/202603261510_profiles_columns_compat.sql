alter table if exists public.profiles
  add column if not exists primary_goal text,
  add column if not exists main_struggle text,
  add column if not exists stress_level text default 'medium',
  add column if not exists onboarding_complete boolean default false,
  add column if not exists updated_at timestamptz default now();

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'accountability_style'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'accountability_mode'
  ) then
    alter table public.profiles rename column accountability_style to accountability_mode;
  end if;
end
$$;

alter table if exists public.profiles
  add column if not exists accountability_mode text default 'solo';
