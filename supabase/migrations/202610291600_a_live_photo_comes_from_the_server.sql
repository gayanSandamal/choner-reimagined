-- A live photo comes from the server.
--
-- 202609291200 made the badge impossible to INHERIT: any avatar_url change
-- outside set_live_photo() resets photo_status, and the trigger refuses a
-- hand-set 'photo_confirmed'. 202610291400 then stopped set_live_photo()
-- taking an opaque URL and made it check that the path is under the caller's
-- own folder. Both are right and both stay.
--
-- Neither stops the badge being MINTED. The remaining hole, measured against
-- production before writing this:
--
--   1. upload any image to `<uid>/anything.jpg`   (avatars_owner_write allows
--      anything under your own folder, at any depth)
--   2. call set_live_photo('<uid>/anything.jpg')  (ownership check passes)
--   -> photo_status = 'photo_confirmed'
--
-- Two REST calls with the anon key that ships in the app binary, no camera
-- involved. The gallery photo, or a photo of somebody else off the internet,
-- earns the badge. set_live_photo() did not even require the object to exist,
-- so the badge could be earned with no image at all.
--
-- The camera-only rule lives entirely in app/onboarding/photo.tsx. A rule the
-- client enforces is not a rule.
--
-- WHAT THE BADGE MEANS AFTER THIS
--
-- "These bytes passed through our server." That is enforceable, and it is all
-- that is claimed. It is NOT proof a real face was in front of a real camera:
-- a modified client can still POST a JPEG to the edge function. Closing that
-- needs device attestation (Play Integrity / App Attest), and proving a live
-- human needs real liveness detection, which is biometric processing and
-- changes the Play Data safety declaration. Both are deliberately out of scope
-- here. The copy still says "Photo confirmed", never "verified", and still
-- only promises the photo was taken live — unchanged since 2026-09-21.
--
-- HOW
--
-- `<uid>/live/` becomes a server-only prefix. Clients cannot insert or update
-- there, so they cannot pre-place bytes and then claim them; only the service
-- role, which bypasses RLS, can write it. The badge can then only be awarded
-- for a path in that prefix that actually exists and was just written.
--
-- Checked first: zero objects currently live under a `live/` folder. Real
-- captures are at `<uid>/live-<ts>.jpg` — a FILENAME beginning "live-", not a
-- folder — and seed faces at `<uid>/faces/<file>`. So the prefix is free and
-- nothing existing is affected.

-- ============================================================
-- 1. <uid>/live/ is the server's to write
-- ============================================================
-- RESTRICTIVE, which ANDs with the permissive policies instead of replacing
-- them: 202607311000's owner-only rules and 202610291400's read policy are
-- left exactly as they are, and this only subtracts.
--
-- SELECT and DELETE are deliberately not restricted. The owner still has to
-- read their own live photo for every render (lib/avatars.ts signs it), and
-- deleting one only destroys their own image — they still cannot put anything
-- back, because INSERT here is closed.

drop policy if exists "avatars_live_is_server_only_insert" on storage.objects;
create policy "avatars_live_is_server_only_insert" on storage.objects
  as restrictive for insert to authenticated
  with check (
    bucket_id <> 'avatars'
    or split_part(name, '/', 2) is distinct from 'live'
  );

-- Without this, the bytes could be swapped after the fact: the badge would
-- survive, pointing at a gallery photo written over a server-written path.
drop policy if exists "avatars_live_is_server_only_update" on storage.objects;
create policy "avatars_live_is_server_only_update" on storage.objects
  as restrictive for update to authenticated
  using (
    bucket_id <> 'avatars'
    or split_part(name, '/', 2) is distinct from 'live'
  )
  with check (
    bucket_id <> 'avatars'
    or split_part(name, '/', 2) is distinct from 'live'
  );

-- ============================================================
-- 2. Awarding the badge becomes a server-only operation
-- ============================================================
-- set_live_photo(text) resolved the user from auth.uid(), which is exactly
-- what a service-role caller does not have. So the server gets its own
-- entry point that is told which user it authenticated, and the client-callable
-- one goes away entirely.
--
-- Everything the old function could not check is checked here, because a path
-- in a server-only prefix is worth something:
--   - the leading folder is the user it is being awarded to
--   - the path is in the server-only prefix
--   - an object really exists there, in this bucket
--   - it was written seconds ago, not recovered from months back
--
-- The freshness window is generous on purpose: it only has to cover one
-- upload-then-award round trip inside the edge function, and a slow phone on
-- a bad connection still has to fit.

create or replace function public.set_live_photo_for(p_uid uuid, p_path text)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.profiles;
  v_written timestamptz;
begin
  if p_uid is null then
    raise exception 'a live photo needs a user';
  end if;
  if p_path is null or length(trim(p_path)) = 0 then
    raise exception 'a live photo needs a path';
  end if;
  if public.storage_owner_uuid(p_path) is distinct from p_uid then
    raise exception 'a live photo must live under that user''s own folder';
  end if;
  if split_part(p_path, '/', 2) is distinct from 'live' then
    raise exception 'a live photo must live in the server-only prefix';
  end if;

  select o.created_at into v_written
  from storage.objects o
  where o.bucket_id = 'avatars' and o.name = p_path;

  if v_written is null then
    raise exception 'no such live photo';
  end if;
  if v_written < now() - interval '5 minutes' then
    raise exception 'that live photo is not fresh';
  end if;

  -- Transaction-local, so it cannot leak into another statement. This is the
  -- flag profiles_reset_photo_status (202609291200) looks for.
  perform set_config('choner.live_photo', 'on', true);

  update public.profiles
  set avatar_url = p_path,
      photo_status = 'photo_confirmed',
      photo_confirmed_at = now(),
      updated_at = now()
  where id = p_uid
  returning * into v_row;

  perform set_config('choner.live_photo', 'off', true);

  if v_row.id is null then
    raise exception 'no profile for this user';
  end if;
  return v_row;
end;
$$;

revoke all on function public.set_live_photo_for(uuid, text) from public, anon, authenticated;
grant execute on function public.set_live_photo_for(uuid, text) to service_role;

-- The client-callable one goes. Leaving it revoked-but-present would be a
-- function nothing can call, and the next person would have to work out why.
-- Nothing in the app calls it after this change: features/profile/api.ts
-- invokes the submit-live-photo edge function instead.
--
-- This does break live capture for any build still calling it. That is
-- already true of 202610291400, which renamed the argument, and the app is in
-- internal testing rather than public release.
drop function if exists public.set_live_photo(text);

-- clear_live_photo() stays exactly as it is and stays client-callable: giving
-- up your own badge needs no protection. Its grants are tightened to match
-- every other definer function here, since it still held EXECUTE for PUBLIC
-- and anon.
revoke all on function public.clear_live_photo() from public, anon;
grant execute on function public.clear_live_photo() to authenticated;

comment on column public.profiles.photo_status is
  'photo_confirmed = the bytes were written by submit-live-photo and awarded '
  'by set_live_photo_for(). no_photo = none, skipped, or replaced from the '
  'gallery. Never means identity verified, and never proves a live human.';

-- Verify (the mint, which must now fail at both steps):
--   -- as an authenticated user, upload to <uid>/live/x.jpg  -> refused by RLS
--   select public.set_live_photo_for(auth.uid(), auth.uid() || '/live/x.jpg');
--   -- -> permission denied for function set_live_photo_for
