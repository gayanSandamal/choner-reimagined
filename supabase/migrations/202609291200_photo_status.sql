-- Photo confirmed, and what that is allowed to mean.
--
-- The live-photo step (app/onboarding/photo.tsx, Dinesh's fe4) has nowhere to
-- write. This gives it a column.
--
-- IT REUSES THE `avatars` BUCKET. 202607311000 already created it with exactly
-- the policies this needs - public read, owner-only write, update and delete,
-- keyed on `<user_id>/<file>` - and `profiles.avatar_url` already holds the
-- URL. A second bucket would be a second set of policies to keep correct for
-- no gain.
--
-- THE WHOLE POINT IS THE INTEGRITY RULE BELOW. Choner checks that a photo was
-- taken LIVE, not who is in it. Two strangers are going to meet in person
-- partly on the strength of that badge, so it must never be possible to earn
-- it with a gallery photo. Edit profile still uploads from the gallery
-- (app/profile/edit.tsx uses expo-image-picker), into the same bucket and the
-- same column. Without a rule, a gallery upload would inherit a badge earned
-- weeks earlier by a live capture.
--
-- So: any change to avatar_url resets photo_status to 'no_photo' UNLESS it
-- came through set_live_photo(). The badge cannot outlive the photo that
-- earned it.
--
-- COPY CONSTRAINT THAT IS ALSO A PRODUCT CONSTRAINT: the value is
-- 'photo_confirmed', never 'verified'. Locked 2026-09-21. Nothing in the data
-- model should be named verified either, because Choner cannot stand behind an
-- identity claim.

-- ============================================================
-- 1. The column
-- ============================================================
alter table public.profiles
  add column if not exists photo_status text not null default 'no_photo';

alter table public.profiles
  add column if not exists photo_confirmed_at timestamptz;

alter table public.profiles
  drop constraint if exists profiles_photo_status_check;
alter table public.profiles
  add constraint profiles_photo_status_check
  check (photo_status in ('photo_confirmed', 'no_photo'));

comment on column public.profiles.photo_status is
  'photo_confirmed = taken live through set_live_photo(). no_photo = none, '
  'skipped, or replaced from the gallery. Never means identity verified.';

-- Nobody has taken a live photo yet, so everyone starts at no_photo even if
-- they already have a gallery avatar. That is correct: an avatar uploaded
-- before this existed was never confirmed live.
update public.profiles
set photo_status = 'no_photo'
where photo_status is distinct from 'no_photo';

-- ============================================================
-- 2. The only way to earn the badge
-- ============================================================
-- Sets the URL and the status in one statement, with the flag the trigger
-- below looks for. The app calls this instead of updating avatar_url directly.
create or replace function public.set_live_photo(p_url text)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.profiles;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  if p_url is null or length(trim(p_url)) = 0 then
    raise exception 'a live photo needs a url';
  end if;

  -- Transaction-local, so it cannot leak into another statement.
  perform set_config('choner.live_photo', 'on', true);

  update public.profiles
  set avatar_url = p_url,
      photo_status = 'photo_confirmed',
      photo_confirmed_at = now(),
      updated_at = now()
  where id = v_uid
  returning * into v_row;

  perform set_config('choner.live_photo', 'off', true);

  if v_row.id is null then
    raise exception 'no profile for this user';
  end if;
  return v_row;
end;
$$;

grant execute on function public.set_live_photo(text) to authenticated;

-- "Set up later", and Profile's remove-photo path.
create or replace function public.clear_live_photo()
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.profiles;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  update public.profiles
  set photo_status = 'no_photo',
      photo_confirmed_at = null,
      updated_at = now()
  where id = v_uid
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.clear_live_photo() to authenticated;

-- ============================================================
-- 3. The rule
-- ============================================================
create or replace function public.reset_photo_status_on_avatar_change()
returns trigger
language plpgsql
as $$
begin
  -- Anything that changes the photo outside set_live_photo() loses the badge.
  if new.avatar_url is distinct from old.avatar_url
     and coalesce(current_setting('choner.live_photo', true), 'off') <> 'on' then
    new.photo_status := 'no_photo';
    new.photo_confirmed_at := null;
  end if;

  -- And the badge cannot be set by hand, from the client or anywhere else.
  if new.photo_status = 'photo_confirmed'
     and old.photo_status is distinct from 'photo_confirmed'
     and coalesce(current_setting('choner.live_photo', true), 'off') <> 'on' then
    new.photo_status := old.photo_status;
    new.photo_confirmed_at := old.photo_confirmed_at;
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_reset_photo_status on public.profiles;
create trigger profiles_reset_photo_status
  before update on public.profiles
  for each row execute function public.reset_photo_status_on_avatar_change();

-- Done when: onboarding can upload and earn the badge, Profile can retake,
-- "Set up later" leaves a clean no-photo state, and a gallery upload through
-- Edit profile drops the badge.
--
-- Verify (as an authenticated user):
--   select public.set_live_photo('https://example.test/a.jpg');
--   -- photo_status = 'photo_confirmed'
--   update public.profiles set avatar_url = 'https://example.test/b.jpg' where id = auth.uid();
--   -- photo_status back to 'no_photo'
--   update public.profiles set photo_status = 'photo_confirmed' where id = auth.uid();
--   -- still 'no_photo'
