-- Deleting your account stops failing.
--
-- delete_account() is one statement — `delete from auth.users where id =
-- auth.uid()` — so what actually happens to a person's data is decided
-- entirely by foreign key delete rules. Forty-six of them cascade and eleven
-- set null, which is right. Three were left at the default, NO ACTION, which
-- does not leave the data behind: it REFUSES THE DELETE.
--
--   challenge_invites.invited_by
--   groups.created_by
--   prelaunch_registrations.claimed_by
--
-- Anyone holding a row through one of those could not delete their account at
-- all. The button raised a foreign key violation and the account stayed.
-- Verified against production before writing this: two live accounts, both
-- blocked by challenge_invites_invited_by_fkey.
--
-- WHY THE CASCADE CHAIN DOESN'T ALREADY COVER IT
--
-- It looks like it should. challenge_invites.user_challenge_id cascades from
-- user_challenges, which cascades from auth.users, so an invite ought to be
-- gone before invited_by is ever checked. It isn't: the restriction is
-- enforced against rows that remain, and invites pointing at a challenge that
-- is not the deleting user's own survive that chain. Two accounts proved it.
--
-- WHY EACH ONE GETS WHAT IT GETS
--
-- invited_by -> CASCADE. An invite is a message from one person to another.
-- With its sender gone it cannot be honoured, and leaving it set-null would
-- leave an invitation from nobody that the other side could still accept.
-- accepted_by is already set null, so an invite someone accepted does not
-- keep that person pinned to it either.
--
-- created_by -> SET NULL. A group has other members and outlives whoever
-- started it. Deleting the group because its creator left would take other
-- people's content with it.
--
-- claimed_by -> SET NULL. A prelaunch registration is a waitlist entry made
-- before any account existed and on its own footing; the account that later
-- claimed it is a link, not ownership. Clearing the link lets the account go.
--
-- STILL NOT HANDLED, DELIBERATELY
--
-- A prelaunch_registrations row holds an email address, and set null keeps the
-- row. Someone who deletes their account therefore still has an email in that
-- table. That is defensible — the waitlist was a separate thing they signed up
-- for — but it is a decision, not an accident, and the deletion page points
-- people at email for exactly this kind of request.
--
-- Storage is the other gap: files in the avatars and checkin-photos buckets
-- have no foreign key to auth.users, so they survive the delete, and avatars
-- is a public bucket. Removing them needs the storage API rather than SQL, so
-- it belongs in an edge function, not here.

alter table public.challenge_invites
  drop constraint if exists challenge_invites_invited_by_fkey;
alter table public.challenge_invites
  add constraint challenge_invites_invited_by_fkey
  foreign key (invited_by) references auth.users(id) on delete cascade;

alter table public.groups
  drop constraint if exists groups_created_by_fkey;
alter table public.groups
  add constraint groups_created_by_fkey
  foreign key (created_by) references auth.users(id) on delete set null;

alter table public.prelaunch_registrations
  drop constraint if exists prelaunch_registrations_claimed_by_fkey;
alter table public.prelaunch_registrations
  add constraint prelaunch_registrations_claimed_by_fkey
  foreign key (claimed_by) references auth.users(id) on delete set null;
