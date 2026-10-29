-- Deleting your account takes your email address with it.
--
-- 202610282100 made delete_account() stop failing. It still did not finish the
-- job: the function is one statement against auth.users, so only data reachable
-- through a foreign key to auth.users goes anywhere. An email address sitting
-- in a plain text column is reachable through nothing, and stayed.
--
-- Found on 2026-10-29 removing one tester by hand. After their auth row,
-- profile, challenge, notification preferences, sessions and identity were all
-- gone, a full-catalog sweep still turned up their address. Two places:
--
--   challenge_invites.email         an invite somebody sent TO them
--   prelaunch_registrations.email   their waitlist entry (citext)
--
-- WHY THE EXISTING RULES DON'T COVER EITHER
--
-- challenge_invites.invited_by cascades, so invites they SENT are removed. An
-- invite addressed to them is the other direction: their email is the only
-- thing identifying them on that row, there is no user id to hang a foreign key
-- on, and nothing cascades. The row also cannot be honoured any more — it is a
-- pending invitation to an account that no longer exists — which is the same
-- reasoning 202610282100 used to cascade invites rather than set them null.
--
-- prelaunch_registrations.claimed_by was deliberately set to SET NULL, on the
-- grounds that a waitlist entry predates the account and stands on its own.
-- That is defensible for the link and wrong for the address: someone who asks
-- to be deleted does not mean "except the copy on the waitlist". The link is
-- now cleared AND the row goes.
--
-- THE SELF-REFERENCE THAT REFUSES THE DELETE
--
-- prelaunch_registrations.referred_by points at prelaunch_registrations.id and
-- is NO ACTION, so a waitlist row that somebody else was referred from cannot
-- be deleted while that referral exists — the same class of bug 202610282100
-- fixed, one table over, and it raises rather than leaving data behind. The
-- referral pointers are cleared first. That loses "X referred Y" on rows
-- belonging to other people, which is the honest consequence of deleting X:
-- the attribution cannot outlive the person it names. Y's own row is untouched.
--
-- WHAT IS STILL NOT HANDLED
--
-- Storage. Files in avatars and checkin-photos have no foreign key to
-- auth.users and survive the delete, and avatars is a public bucket, so an
-- avatar URL keeps resolving after the account is gone. Removing them needs
-- the storage API, not SQL, so it belongs in an edge function. This migration
-- does not pretend to have fixed it.
--
-- Two unrelated things about this function, fixed while rewriting it: it had no
-- `set search_path`, unusual for a security definer here, and PUBLIC and anon
-- held EXECUTE. Neither was exploitable — the function refuses an anonymous
-- caller on the first branch — but both are tightened to match every other
-- definer function in this schema.

create or replace function public.delete_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  -- Read before the delete; afterwards there is nothing left to read it from.
  select u.email into v_email from auth.users u where u.id = v_uid;

  -- 1. Invitations addressed to this person, which name them by email only.
  -- challenge_invites is the live table; invites is the unused legacy one, and
  -- is covered here so a stray row cannot outlive the person either.
  if v_email is not null then
    delete from public.challenge_invites where lower(email) = lower(v_email);
    delete from public.invites where lower(email) = lower(v_email);
  end if;

  -- 2. The waitlist entry. Clear the referral pointers that would otherwise
  -- refuse the delete, then take the row. Matched on claimed_by for an entry
  -- they claimed and on email for one they never did; prelaunch email is
  -- citext, so that comparison is already case-insensitive.
  update public.prelaunch_registrations
     set referred_by = null
   where referred_by in (
     select r.id from public.prelaunch_registrations r
      where r.claimed_by = v_uid
         or (v_email is not null and r.email = v_email)
   );

  delete from public.prelaunch_registrations
   where claimed_by = v_uid
      or (v_email is not null and email = v_email);

  -- 3. Everything else rides on the foreign key delete rules, as before:
  -- 47 cascade, 13 set null, and since 202610282100 none are NO ACTION.
  delete from auth.users where id = v_uid;
end;
$$;

revoke all on function public.delete_account() from public, anon;
grant execute on function public.delete_account() to authenticated;
