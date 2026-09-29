-- The why becomes private at the data layer.
--
-- `challenge_reflections` was given correct own-only policies in
-- 202608131000_challenge_setup_why.sql:134-149. Then
-- 202608131600_partner_path_single_challenge.sql:518 added
-- `challenge_reflections_partner_select`, which lets a partner read the other
-- person's answers. That existed to feed the "Why Gayan is doing this" card on
-- Session Details.
--
-- Decided 2026-09-27: the why is PRIVATE. It is a commitment device for the
-- person who wrote it, not something shown to the partner. The card has been
-- removed from the app, so this policy is now exposure with nothing using it.
--
-- One line, and it is the first thing to land: until it does, every reflection
-- ever written is readable by the other side.

drop policy if exists challenge_reflections_partner_select on public.challenge_reflections;

-- Leaves the four own-only policies untouched. After this, a partner selecting
-- another user's rows gets zero rows rather than their answers.
--
-- Verify:
--   set local role authenticated;
--   set local request.jwt.claims = '{"sub":"<partner-uuid>"}';
--   select count(*) from public.challenge_reflections where user_id = '<their-uuid>';
--   -- expect 0
