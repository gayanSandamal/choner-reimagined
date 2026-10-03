-- An invite no longer needs an email (#110).
--
-- The invite screen is share-first now, as in the prototype: your message, the
-- link and the 6-character code go out through WhatsApp, Messages or a copied
-- link, and email is the optional second way. Accepting never reads the email
-- (accept_challenge_invite, accept_invite_by_code and preview_invite all work
-- from the token or the code), so the column only has to stop being required.
alter table public.challenge_invites
  alter column email drop not null;
