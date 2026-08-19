-- The "don't ask me again" index has to be targetable by an upsert.
--
-- 202608181200 built it over coalesce(user_challenge_id, <sentinel>) to make
-- NULLs collide. That works for uniqueness, but it is an EXPRESSION index, and
-- PostgREST resolves `on_conflict=shared_by,user_challenge_id,kind` against
-- real columns only -- so every upsert from the client would have failed to
-- find a matching arbiter.
--
-- Postgres 15 added NULLS NOT DISTINCT, which gets the same collision
-- behaviour from a plain column index. This project is on 17.
drop index if exists public.milestones_one_per_kind;

create unique index if not exists milestones_one_per_kind
  on public.milestones (shared_by, user_challenge_id, kind) nulls not distinct;

notify pgrst, 'reload schema';
