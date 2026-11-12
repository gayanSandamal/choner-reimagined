-- Community becomes a feed of posts (decided 10 to 12 Nov 2026, see
-- docs/DECISIONS_LOG.md "The Community feed").
--
-- A post is one person's own: a photo from the session (live camera only) or
-- just words, with an optional line of up to 140 characters. It goes up at
-- once, with the poster's first name only. No partner approval and no
-- "who is in it" question. Anyone can hide, report or block; the poster's
-- partner can also remove it for everyone, straight away.
--
-- Shipped after store review, together with the Home gallery. The old
-- milestones feed (get_city_feed) is left in place and untouched, so a build
-- from before this one keeps working.

-- ============================================================
-- 1. Tables
-- ============================================================

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('photo', 'text')),
  -- <user_id>/<unique>.jpg in the private community-photos bucket.
  photo_path text,
  body text not null default '' check (char_length(body) <= 140),
  background text not null default 'orange' check (background in ('orange', 'navy', 'green', 'violet')),
  activity_key text,
  -- Sessions done together when it was posted: the "Day 5" on the card.
  sessions_together int,
  city text,
  created_at timestamptz not null default now(),
  removed_at timestamptz,
  removed_by uuid references auth.users(id) on delete set null,
  constraint community_posts_photo_has_path check (kind <> 'photo' or photo_path is not null),
  constraint community_posts_text_has_words check (kind <> 'text' or char_length(btrim(body)) > 0)
);
create index if not exists community_posts_city_idx on public.community_posts (city, created_at desc) where removed_at is null;
create index if not exists community_posts_user_idx on public.community_posts (user_id);

create table if not exists public.community_post_claps (
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.community_post_hides (
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

-- Read by Dinesh and Gayan, who act on every report within 24 hours (the
-- stores' rule for user posts).
create table if not exists public.community_post_reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique (post_id, reporter_id)
);

-- Everything goes through the functions below; nobody reads or writes these
-- tables directly.
alter table public.community_posts enable row level security;
alter table public.community_post_claps enable row level security;
alter table public.community_post_hides enable row level security;
alter table public.community_post_reports enable row level security;

-- ============================================================
-- 2. Photos: a private bucket, your own folder
-- ============================================================

insert into storage.buckets (id, name, public)
values ('community-photos', 'community-photos', false)
on conflict (id) do nothing;

drop policy if exists "community photos: upload to own folder" on storage.objects;
create policy "community photos: upload to own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'community-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "community photos: delete own" on storage.objects;
create policy "community photos: delete own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'community-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- A photo is readable (signable) by anyone signed in only while its post is
-- up. Removed posts stop signing.
drop policy if exists "community photos: read while posted" on storage.objects;
create policy "community photos: read while posted" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'community-photos'
    and exists (
      select 1 from public.community_posts p
      where p.photo_path = storage.objects.name and p.removed_at is null
    )
  );

-- ============================================================
-- 3. Helpers
-- ============================================================

create or replace function public.active_partner_of(p_user uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select case when p.user_a = p_user then p.user_b else p.user_a end
  from public.partnerships p
  where p.state = 'active' and p_user in (p.user_a, p.user_b)
  limit 1;
$$;
revoke all on function public.active_partner_of(uuid) from public, anon, authenticated;

-- Contact details are refused, so the feed cannot be used to reach a
-- stranger: phone numbers, @handles and links. Mirrors features/community/posts.ts.
create or replace function public.community_body_ok(p_body text)
returns boolean
language sql
immutable
as $$
  select coalesce(p_body, '') !~* '(\+?[0-9][0-9 -]{7,}[0-9])|(@[a-z0-9_.]{2,})|(https?://|www\.)';
$$;

-- ============================================================
-- 4. Posting
-- ============================================================

create or replace function public.create_community_post(
  p_kind text,
  p_body text default '',
  p_background text default 'orange',
  p_photo_path text default null,
  p_activity_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_body text := btrim(coalesce(p_body, ''));
  v_city text;
  v_sessions int;
  v_partner uuid;
  v_name text;
  v_id uuid;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if p_kind not in ('photo', 'text') then return jsonb_build_object('ok', false, 'reason', 'bad_kind'); end if;
  if char_length(v_body) > 140 then return jsonb_build_object('ok', false, 'reason', 'too_long'); end if;
  if not public.community_body_ok(v_body) then return jsonb_build_object('ok', false, 'reason', 'contact_details'); end if;
  if p_kind = 'text' and v_body = '' then return jsonb_build_object('ok', false, 'reason', 'empty'); end if;
  if p_kind = 'photo' and (p_photo_path is null or split_part(p_photo_path, '/', 1) <> v_uid::text) then
    return jsonb_build_object('ok', false, 'reason', 'bad_photo');
  end if;

  select city into v_city from public.profiles where id = v_uid;
  select count(*) into v_sessions from public.pair_plans
  where status = 'completed' and v_uid in (user_a, user_b);

  insert into public.community_posts (user_id, kind, photo_path, body, background, activity_key, sessions_together, city)
  values (v_uid, p_kind, case when p_kind = 'photo' then p_photo_path end, v_body,
          coalesce(nullif(p_background, ''), 'orange'), p_activity_key, nullif(v_sessions, 0), v_city)
  returning id into v_id;

  -- Your partner is told, so a photo they are in never goes up behind their back.
  v_partner := public.active_partner_of(v_uid);
  if v_partner is not null then
    select split_part(coalesce(full_name, 'Your partner'), ' ', 1) into v_name from public.profiles where id = v_uid;
    perform public.notify_user(v_partner, 'community_post', v_name || ' shared today''s session',
      'It''s on Community. You can remove it from the post''s menu.', '/(tabs)/community');
  end if;

  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;
revoke all on function public.create_community_post(text, text, text, text, text) from public, anon;
grant execute on function public.create_community_post(text, text, text, text, text) to authenticated;

-- ============================================================
-- 5. The feed
-- ============================================================

create or replace function public.get_community_feed(p_before timestamptz default null, p_limit int default 20)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_city text;
  v_partner uuid;
  v_rows jsonb;
begin
  if v_uid is null then return '[]'::jsonb; end if;
  select city into v_city from public.profiles where id = v_uid;
  v_partner := public.active_partner_of(v_uid);

  select coalesce(jsonb_agg(row_to_json(x)::jsonb order by x.created_at desc), '[]'::jsonb) into v_rows
  from (
    select
      p.id, p.kind, p.photo_path, p.body, p.background, p.activity_key, p.sessions_together, p.created_at,
      split_part(coalesce(pr.full_name, 'Someone'), ' ', 1) as author_name,
      pr.avatar_url as author_avatar,
      (p.user_id = v_uid) as is_mine,
      (v_partner is not null and p.user_id = v_partner) as is_partner,
      (select count(*) from public.community_post_claps c where c.post_id = p.id) as claps,
      exists (select 1 from public.community_post_claps c where c.post_id = p.id and c.user_id = v_uid) as i_clapped
    from public.community_posts p
    join public.profiles pr on pr.id = p.user_id
    where p.removed_at is null
      and p.city is not null and p.city = v_city
      and (p_before is null or p.created_at < p_before)
      and not public.blocked_between(v_uid, p.user_id)
      and not exists (select 1 from public.community_post_hides h where h.post_id = p.id and h.user_id = v_uid)
    order by p.created_at desc
    limit least(greatest(coalesce(p_limit, 20), 1), 50)
  ) x;

  return v_rows;
end;
$$;
revoke all on function public.get_community_feed(timestamptz, int) from public, anon;
grant execute on function public.get_community_feed(timestamptz, int) to authenticated;

-- ============================================================
-- 6. Clap, hide, report, block, remove
-- ============================================================

create or replace function public.toggle_community_clap(p_post_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if not exists (select 1 from public.community_posts where id = p_post_id and removed_at is null and user_id <> v_uid) then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  if exists (select 1 from public.community_post_claps where post_id = p_post_id and user_id = v_uid) then
    delete from public.community_post_claps where post_id = p_post_id and user_id = v_uid;
    return jsonb_build_object('ok', true, 'clapped', false);
  end if;
  insert into public.community_post_claps (post_id, user_id) values (p_post_id, v_uid);
  return jsonb_build_object('ok', true, 'clapped', true);
end;
$$;
revoke all on function public.toggle_community_clap(uuid) from public, anon;
grant execute on function public.toggle_community_clap(uuid) to authenticated;

create or replace function public.hide_community_post(p_post_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  insert into public.community_post_hides (post_id, user_id) values (p_post_id, v_uid) on conflict do nothing;
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.hide_community_post(uuid) from public, anon;
grant execute on function public.hide_community_post(uuid) to authenticated;

-- A report also hides the post for the reporter at once.
create or replace function public.report_community_post(p_post_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if not exists (select 1 from public.community_posts where id = p_post_id) then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  insert into public.community_post_reports (post_id, reporter_id) values (p_post_id, v_uid) on conflict do nothing;
  insert into public.community_post_hides (post_id, user_id) values (p_post_id, v_uid) on conflict do nothing;
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.report_community_post(uuid) from public, anon;
grant execute on function public.report_community_post(uuid) to authenticated;

-- Not offered on your own partner's post: ending or blocking a partner is
-- Find's job, and it ends the pairing properly.
create or replace function public.block_community_author(p_post_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_uid uuid := auth.uid(); v_author uuid;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select user_id into v_author from public.community_posts where id = p_post_id;
  if v_author is null or v_author = v_uid or v_author = public.active_partner_of(v_uid) then
    return jsonb_build_object('ok', false, 'reason', 'not_blockable');
  end if;
  insert into public.user_blocks (blocker_id, blocked_id) values (v_uid, v_author) on conflict do nothing;
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.block_community_author(uuid) from public, anon;
grant execute on function public.block_community_author(uuid) to authenticated;

-- The poster, or the poster's partner, takes it down for everyone.
create or replace function public.remove_community_post(p_post_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_uid uuid := auth.uid(); p record; v_name text;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select * into p from public.community_posts where id = p_post_id and removed_at is null;
  if p.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if p.user_id <> v_uid and public.active_partner_of(p.user_id) is distinct from v_uid then
    return jsonb_build_object('ok', false, 'reason', 'not_allowed');
  end if;
  update public.community_posts set removed_at = now(), removed_by = v_uid where id = p.id;
  if p.user_id <> v_uid then
    select split_part(coalesce(full_name, 'Your partner'), ' ', 1) into v_name from public.profiles where id = v_uid;
    perform public.notify_user(p.user_id, 'community_post_removed', v_name || ' took down your post',
      'Your partner removed it from Community.', '/(tabs)/community');
  end if;
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.remove_community_post(uuid) from public, anon;
grant execute on function public.remove_community_post(uuid) to authenticated;
