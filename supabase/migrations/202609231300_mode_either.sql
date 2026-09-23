-- "Either works" (decision D3, 2026-09-23).
--
-- Mode stays on the pre-match form because the matcher hard-filters on it —
-- moving it after the match (as the handover proposed) would pair someone who
-- wants to meet with someone who doesn't. 'either' keeps the flexibility the
-- handover wanted: it is compatible with both, and the post-match "Run
-- together or separately" screen asks only when BOTH said either.
alter table public.user_challenges drop constraint if exists user_challenges_mode_check;
alter table public.user_challenges
  add constraint user_challenges_mode_check
  check (mode in ('together', 'separate', 'either'));
