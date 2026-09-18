-- The previous migration added a defaulted argument to three functions rather
-- than replacing them, which leaves BOTH signatures live. Postgres then can't
-- resolve the old call shapes:
--
--   get_my_match()                -> ambiguous between () and (uuid default null)
--   get_partner_status(uuid)      -> ambiguous between (uuid) and (uuid, uuid default null)
--   ensure_user_challenge(a,b,c)  -> ambiguous against the 4-arg default form
--
-- Every existing client call uses exactly those shapes, so leaving the old
-- ones in place would break the app at runtime with
-- "function ... is not unique". Drop the superseded versions; the defaulted
-- ones cover the identical call sites.

drop function if exists public.get_my_match();
drop function if exists public.get_partner_status(uuid);
drop function if exists public.ensure_user_challenge(uuid, uuid, text);
