-- ============================================================
-- Fix embedded PostgREST joins from posts / post_comments /
-- group_members to public.profiles.
--
-- Why: the existing foreign keys point at auth.users, so the
-- client-side embeds like `profiles!posts_author_id_fkey(...)`
-- cannot be resolved and surface "Something went wrong" in the
-- community feed, group lists, and post detail screens.
--
-- Strategy:
--   1. Ensure every auth.users row has a matching profiles row
--      (backfill + trigger).
--   2. Repoint the FKs from auth.users to public.profiles, keeping
--      the original constraint names so the client embed hints
--      continue to work. profiles.id itself cascades to auth.users,
--      so account deletion still propagates correctly.
-- ============================================================

-- 1. Backfill profiles for any existing auth.users without one.
insert into public.profiles (id)
select u.id from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);

-- 2. Trigger: auto-create a profile row whenever auth.users gains a row.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', null)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- 3. Repoint FKs to public.profiles so PostgREST can resolve the
--    `profiles!<fk_name>(...)` embeds used in features/community/api.ts.
do $$ begin
  if exists (
    select 1 from pg_constraint
    where conname = 'posts_author_id_fkey' and conrelid = 'public.posts'::regclass
  ) then
    alter table public.posts drop constraint posts_author_id_fkey;
  end if;
  alter table public.posts
    add constraint posts_author_id_fkey
    foreign key (author_id) references public.profiles(id) on delete cascade;
end $$;

do $$ begin
  if exists (
    select 1 from pg_constraint
    where conname = 'post_comments_author_id_fkey' and conrelid = 'public.post_comments'::regclass
  ) then
    alter table public.post_comments drop constraint post_comments_author_id_fkey;
  end if;
  alter table public.post_comments
    add constraint post_comments_author_id_fkey
    foreign key (author_id) references public.profiles(id) on delete cascade;
end $$;

do $$ begin
  if exists (
    select 1 from pg_constraint
    where conname = 'group_members_user_id_fkey' and conrelid = 'public.group_members'::regclass
  ) then
    alter table public.group_members drop constraint group_members_user_id_fkey;
  end if;
  alter table public.group_members
    add constraint group_members_user_id_fkey
    foreign key (user_id) references public.profiles(id) on delete cascade;
end $$;
