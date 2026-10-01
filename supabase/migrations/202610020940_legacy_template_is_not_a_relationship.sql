-- legacy_template_id must not be a foreign key. It broke every challenge read.
--
-- 202610020900 added user_challenges.legacy_template_id as a REFERENCE to
-- challenge_templates. That gave user_challenges two foreign keys to the same
-- table, and PostgREST refuses to guess which one an embed means:
--
--   select=*,challenge_templates(*)
--   -> "Could not embed because more than one relationship was found for
--       'user_challenges' and 'challenge_templates'"
--
-- That embed is getMyChallenge(), which Home, Challenges, Find and Profile all
-- read, in every build of the app already installed. The tab showed "We can't
-- reach that right now" for everyone from the moment 0900 was applied until
-- this was, roughly ten minutes on 1 October. Found by opening the Challenges
-- tab in the simulator straight after the migration.
--
-- The column is a record of where a row came from, not a relationship anyone
-- queries through, so the constraint is dropped and the value kept. The
-- templates it points at are retired, never deleted, so nothing is lost by
-- not enforcing it.
--
-- For next time: adding a second foreign key between two tables is a breaking
-- API change here, whatever the column is for.

alter table public.user_challenges
  drop constraint if exists user_challenges_legacy_template_id_fkey;

comment on column public.user_challenges.legacy_template_id is
  'The habit template this challenge was on before 202610020900 moved it to '
  'its activity. Null for a challenge that was never moved. Deliberately NOT a '
  'foreign key: a second FK to challenge_templates makes every '
  'challenge_templates(*) embed ambiguous to PostgREST.';

-- PostgREST caches the schema; without this the embed stays broken until it
-- next reloads on its own.
notify pgrst, 'reload schema';

-- Leftover from the daily model, seen on the picker: "A ride a day".
update public.challenge_templates
set summary = 'A ride, at whatever distance you are starting from.',
    description = 'A ride, at whatever distance you are starting from.'
where slug = 'activity-cycling';
