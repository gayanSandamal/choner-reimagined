-- Avatars stop being world-readable.
--
-- `avatars` has been a PUBLIC bucket since 202607311000, with the weakest
-- storage policy in the project: `for select using (bucket_id = 'avatars')`,
-- no role restriction and no auth check at all. Anyone on the internet with
-- the URL — signed in or not, a Choner user or not — gets the bytes.
--
-- TWO MEASURED CONSEQUENCES
--
-- 1. Deletion does not finish. 202610282100 and the delete-account edge
--    function remove the database row and then the object, but the bucket is
--    served through a CDN: after a verified delete the object was gone and a
--    fresh fetch returned 400, while a URL that had already been fetched kept
--    answering 200 with `cf-cache-status: HIT`. A face someone had loaded
--    before the account was deleted stayed available from the edge. That was
--    written up as the open gap at the top of
--    supabase/functions/delete-account/index.ts; this is the fix it names.
--
-- 2. A public URL honours nothing. It outlives the account, it outlives a
--    block, and it does not care whether the person switched themselves out
--    of the directory. The URL itself is the grant.
--
-- WHAT CHANGES, AND WHY IT IS SHAPED THIS WAY
--
-- The bucket goes private and reads happen through short-lived signed URLs,
-- exactly as `checkin-photos` has worked since the same 202607311000
-- migration — same bucket shape, same 10-minute expiry, same re-sign-on-view
-- habit in the client (lib/avatars.ts mirrors getCheckinPhotoUrl).
--
-- That closes the CDN gap outright rather than narrowing it. Measured on a
-- signed avatar response after this migration: `cache-control: private,
-- no-cache` and `cf-cache-status: DYNAMIC`. The edge does not keep a copy of
-- a signed object at all, so there is nothing left to serve once the bytes
-- are deleted — not even to someone holding a signature that has not expired.
--
-- WHY THE READ POLICY IS NOT OWNER-ONLY
--
-- Check-in photos are owner-or-partner because that is literally who they are
-- for. An avatar is the opposite: it exists to be shown to other people. The
-- directory, the city feed, a match offer, a pair plan and the partner card
-- all draw someone else's face, and the viewer is usually a stranger to them.
-- Owner-only would blank every one of those.
--
-- It would also break the sample pool outright. All 1,470 @choner.test
-- profiles point at 100 shared files under ONE account's folder
-- (406e6901-…/faces/), so the object's owner is almost never the profile the
-- avatar belongs to, let alone the viewer.
--
-- WHY THE READ POLICY DOES NOT CHECK user_blocks
--
-- It is the obvious next thought and it is a trap. A policy expression runs
-- as the caller, so the helper it calls needs EXECUTE for `authenticated` —
-- and a function anyone can call that answers "may I see this person's
-- avatar?" is a "who blocked me?" oracle. 202610282000 revoked
-- blocked_between() from every client role for exactly that reason: the one
-- rule 202609231000 set down is that the blocked person is never told.
--
-- So blocking stays where that migration put it: inside the security-definer
-- functions that hand out the path. get_city_feed(), get_active_directory()
-- and the matcher already drop blocked people, and a path you were never
-- given is a path you cannot sign. The same holds for hide_from_directory —
-- get_active_directory() filters on it, while a partner and a community card
-- still show that person's face, which is why the column cannot be a storage
-- rule.
--
-- What the policy below is actually worth: nothing in this bucket is readable
-- without a session, every URL expires, and a deleted object stops being
-- reachable within one signature's lifetime.
--
-- profiles.avatar_url NOW HOLDS A PATH
--
-- It held a full public URL. There is no public URL any more, and baking a
-- signature into a column would store a credential that expires. So the
-- column holds the storage path (`<uid>/<file>`), the client signs on read,
-- and section 4 rewrites the 1,471 existing rows.

-- ============================================================
-- 1. The bucket goes private
-- ============================================================
-- Already-issued public URLs stop resolving the moment this commits. That is
-- the point of the change, not a side effect of it.
update storage.buckets set public = false where id = 'avatars';

-- ============================================================
-- 2. The read policy
-- ============================================================
drop policy if exists "avatars_public_read" on storage.objects;

-- `storage_owner_uuid(name) is not null` (202607311000) is not an ownership
-- check — it only requires the first path segment to parse as a uuid, which
-- is the convention every writer already follows. It keeps the policy from
-- covering stray objects that were uploaded outside it.
drop policy if exists "avatars_signed_in_read" on storage.objects;
create policy "avatars_signed_in_read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'avatars'
    and public.storage_owner_uuid(name) is not null
  );

-- The write policies are unchanged and stay as 202607311000 wrote them:
-- insert, update and delete are owner-only, keyed on the leading folder.

-- ============================================================
-- 3. set_live_photo() takes a path
-- ============================================================
-- Same function, same rule — it is still the only way to earn
-- photo_status = 'photo_confirmed' (202609291200) — but the argument is now
-- the storage path the client just uploaded, so the parameter is renamed off
-- `p_url`. Renaming a parameter needs a drop: callers pass it by name.
--
-- And since the value is a path and not an opaque URL, it can be checked.
-- The badge says this photo was taken live by THIS person, so a path under
-- somebody else's folder is refused rather than stored.
drop function if exists public.set_live_photo(text);

create or replace function public.set_live_photo(p_path text)
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
  if p_path is null or length(trim(p_path)) = 0 then
    raise exception 'a live photo needs a path';
  end if;
  if public.storage_owner_uuid(p_path) is distinct from v_uid then
    raise exception 'a live photo must live under your own folder';
  end if;

  -- Transaction-local, so it cannot leak into another statement.
  perform set_config('choner.live_photo', 'on', true);

  update public.profiles
  set avatar_url = p_path,
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

revoke all on function public.set_live_photo(text) from public, anon;
grant execute on function public.set_live_photo(text) to authenticated;

comment on column public.profiles.avatar_url is
  'Storage path in the private `avatars` bucket (`<uid>/<file>`), never a URL. '
  'Sign it to display — lib/avatars.ts. Any change here resets photo_status '
  'unless it came through set_live_photo().';

-- ============================================================
-- 4. Rewriting the rows that hold a URL
-- ============================================================
-- Every row today is
--   https://<ref>.supabase.co/storage/v1/object/public/avatars/<path>
-- so the rewrite is the substring after the marker. A value that does not
-- contain the marker is left alone: it is not ours to reinterpret, and the
-- client passes anything that still looks like a URL straight through.
--
-- THE GUARD MATTERS. profiles_reset_photo_status (202609291200) fires on any
-- avatar_url change and clears the badge. This update changes the spelling of
-- the value, not the photo, so it sets the same transaction-local flag
-- set_live_photo() uses. Without it the one profile that currently holds
-- photo_confirmed would silently lose the badge to a data migration.
do $$
begin
  perform set_config('choner.live_photo', 'on', true);

  update public.profiles
  set avatar_url = split_part(avatar_url, '/storage/v1/object/public/avatars/', 2)
  where avatar_url like '%/storage/v1/object/public/avatars/%';

  perform set_config('choner.live_photo', 'off', true);
end;
$$;

-- Nothing should be left pointing at a URL in this bucket.
do $$
declare
  v_left int;
begin
  select count(*) into v_left
  from public.profiles
  where avatar_url like '%/storage/v1/object/%avatars/%';
  if v_left > 0 then
    raise exception 'avatar_url still holds % bucket URL(s)', v_left;
  end if;
end;
$$;

-- Done when: the Profile, Community and Who else screens still show faces for
-- a signed-in user; a bare storage URL for an avatar returns 400; and a
-- deleted account's avatar stops resolving once its last signature expires.
--
-- Verify:
--   select public from storage.buckets where id = 'avatars';          -- false
--   select avatar_url from public.profiles where avatar_url is not null limit 1;
--   -- '<uuid>/<file>', no scheme
--   curl -s -o /dev/null -w '%{http_code}\n' \
--     "$SUPABASE_URL/storage/v1/object/public/avatars/<path>"          -- 400
