-- Telling the app that a newer build is in the store.
--
-- There is no expo-updates in this project, so there is no OTA channel to ask
-- and nothing on the device knows that a newer binary exists. Neither store
-- offers a supported API for "what is the current version of this app", and
-- scraping a listing page is the kind of thing that works until the week it
-- matters. So the fact is published here, by us, and the app compares it with
-- the version it was built as.
--
-- WHY NOT app_config
--
-- app_config (202607311700) looks like the obvious home and must not be used:
-- it holds `service_role_key`, and it has RLS enabled with NO policies and all
-- grants revoked precisely so that no signed-in user can read it. Adding a row
-- a client needs to read would mean opening that table or wrapping it in
-- another definer function, and either way the service-role key ends up one
-- mistake away from a client. A separate table with nothing secret in it is
-- the cheaper answer.
--
-- Everything here is already public: a store listing states the current
-- version to anyone who opens it. So this table is readable rather than
-- wrapped in a security-definer function, and `anon` can read it too — a
-- version notice is just as relevant on the sign-in screen as inside the app.
-- Writes stay with the service role (no insert/update/delete policy exists).

create table if not exists public.app_releases (
  platform text primary key check (platform in ('ios', 'android')),
  -- The version string as the store shows it, matching app.json's `version`
  -- (e.g. '0.2.1'). NOT a version code: `appVersionSource: remote` in eas.json
  -- means the build number is assigned by EAS and the one embedded in the
  -- manifest is stale, so comparing codes would be comparing a fiction.
  latest_version text not null,
  -- Where "Update now" goes. A column rather than a constant in the app
  -- because the two stores disagree about URLs, the iOS one does not exist
  -- yet, and neither should need a release to fix.
  store_url text not null check (store_url ~ '^https://'),
  -- Optional one-liner for the notice ("Faster check-ins, fewer crashes").
  notes text,
  updated_at timestamptz not null default now()
);

alter table public.app_releases enable row level security;

drop policy if exists "app_releases_read" on public.app_releases;
create policy "app_releases_read" on public.app_releases
  for select to anon, authenticated
  using (true);

-- REVOKE FIRST, and this is not belt and braces.
--
-- Supabase's default privileges grant ALL on a new public table to anon and
-- authenticated, so a bare `grant select` adds nothing and the table arrives
-- with INSERT, UPDATE, DELETE and TRUNCATE already handed to every client.
-- Measured on this table before this line existed: anon held all seven
-- privileges. Only the absence of a write POLICY was stopping a signed-in
-- user from editing the version everybody else is told to install — one
-- `for all using (true)` away from being writable by anyone.
--
-- 202607311700 does the same thing to app_config for the same reason.
revoke all on public.app_releases from anon, authenticated;
grant select on public.app_releases to anon, authenticated;

-- Android only, deliberately.
--
-- The package is io.choner.app, not com.choner.app: com.choner.app is
-- registered to a different Android developer console account, so the Play
-- account cannot create the app under it (8bb0761, 28 October). Getting this
-- wrong sends everyone to a listing that is not ours.
--
-- iOS has no row because it has no App Store app record yet, and therefore no
-- numeric id to build a link from. A missing row reads as "no update", which
-- is the right default: the notice stays invisible until someone can state a
-- real version and a real URL. Add it when the ASC record exists.
--
-- latest_version is seeded to the version currently shipping (0.2.0), so this
-- migration changes nothing anybody can see. The notice turns on by raising
-- this one value, which also means it can be tested — and switched back off —
-- without a build.
insert into public.app_releases (platform, latest_version, store_url)
values (
  'android',
  '0.2.0',
  'https://play.google.com/store/apps/details?id=io.choner.app'
)
on conflict (platform) do nothing;

comment on table public.app_releases is
  'The version each store is currently serving. Read by every client to decide '
  'whether to offer the update notice; written only by the service role. '
  'Nothing secret belongs here — see app_config for that, which is unreadable '
  'to clients on purpose.';

-- Done when: `select * from app_releases` works as a signed-in user, raising
-- android.latest_version above the installed version makes the notice appear
-- on Home, and lowering it back makes it disappear.
--
-- Verify:
--   select platform, latest_version, store_url from public.app_releases;
--   -- as an anon client: select should succeed; insert should be denied.
