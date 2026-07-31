-- Storage buckets + the partner-visibility rule the verification features rest on.
--
-- Why this exists: the `avatars` bucket was created by hand in the dashboard and
-- was therefore wiped by `db reset --linked` (storage.buckets is just a table),
-- silently breaking avatar upload. Defining buckets and their policies here
-- means the next reset restores them instead of losing them again.
--
-- Path convention for BOTH buckets: <user_id>/<file>. Keying on the owner's uuid
-- is what lets a single RLS expression answer "is this mine?" and "is this my
-- partner's?" without joining through challenges.

-- ============================================================
-- 1. Buckets
-- ============================================================
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Private on purpose. Check-in photos are partner-visible only, so they must
-- never be reachable by public URL — reads go through signed URLs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'checkin-photos', 'checkin-photos', false,
  10485760, -- 10MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ============================================================
-- 2. Partner derivation
-- ============================================================
-- There is no pairs table — a partner is the other party on an accepted invite.
-- Security definer because challenge_invites is not readable by the partner
-- under RLS, and this must work from inside storage policies.
create or replace function public.is_partner_of(p_a uuid, p_b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_a is not null
     and p_b is not null
     and p_a <> p_b
     and exists (
       select 1 from public.challenge_invites
       where status = 'accepted'
         and ((invited_by = p_a and accepted_by = p_b)
           or (invited_by = p_b and accepted_by = p_a))
     );
$$;

-- Storage policies run against arbitrary object names, so a bare ::uuid cast
-- would throw on any malformed path. Swallow the bad cast and return null
-- instead, which then simply fails the ownership checks below.
create or replace function public.storage_owner_uuid(p_name text)
returns uuid
language plpgsql
immutable
as $$
begin
  return (storage.foldername(p_name))[1]::uuid;
exception
  when others then return null;
end;
$$;

grant execute on function public.is_partner_of(uuid, uuid) to authenticated;
grant execute on function public.storage_owner_uuid(text) to authenticated;

-- ============================================================
-- 3. RLS on storage.objects
-- ============================================================
drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "avatars_owner_write" on storage.objects;
create policy "avatars_owner_write" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and public.storage_owner_uuid(name) = auth.uid());

drop policy if exists "avatars_owner_update" on storage.objects;
create policy "avatars_owner_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and public.storage_owner_uuid(name) = auth.uid());

drop policy if exists "avatars_owner_delete" on storage.objects;
create policy "avatars_owner_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and public.storage_owner_uuid(name) = auth.uid());

-- Check-in photos: mine, or my partner's. Nobody else, ever — this single
-- policy is what makes "partner-visible only" true rather than a UI convention.
drop policy if exists "checkin_photos_owner_or_partner_read" on storage.objects;
create policy "checkin_photos_owner_or_partner_read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'checkin-photos'
    and (
      public.storage_owner_uuid(name) = auth.uid()
      or public.is_partner_of(auth.uid(), public.storage_owner_uuid(name))
    )
  );

-- Writes stay owner-only: a partner reviews proof, they never author it.
drop policy if exists "checkin_photos_owner_write" on storage.objects;
create policy "checkin_photos_owner_write" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'checkin-photos' and public.storage_owner_uuid(name) = auth.uid());

drop policy if exists "checkin_photos_owner_update" on storage.objects;
create policy "checkin_photos_owner_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'checkin-photos' and public.storage_owner_uuid(name) = auth.uid());

drop policy if exists "checkin_photos_owner_delete" on storage.objects;
create policy "checkin_photos_owner_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'checkin-photos' and public.storage_owner_uuid(name) = auth.uid());
