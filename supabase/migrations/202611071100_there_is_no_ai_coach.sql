-- There is no AI coach in Choner, so the tables for one go too.
--
-- Three tables were created for a feature the product does not offer:
-- ai_conversations and ai_messages by 202605240114_production_data, and
-- ai_recommendations by 202603261600_schema_alignment. The edge function, the
-- modal, the client hooks and the feature flag were all removed on 2026-11-07
-- on the founder's instruction. These are what is left.
--
-- SAFE TO RUN. Every one of the three was measured empty against production
-- immediately before this file was written:
--
--   ai_conversations      0 rows
--   ai_messages           0 rows
--   ai_recommendations    0 rows
--
-- Nothing reads or writes them: after the code removal the whole repository
-- contains no reference to any of the three. Dropping them loses no data and
-- breaks no query.
--
-- ORDER. Run this AFTER the code change is merged, not before. The old client
-- inserted a default into notification_preferences.ai_recovery_alerts, and
-- while that column is deliberately left in place below, keeping the two
-- steps in this order means there is no window where either half is wrong.
--
-- ai_messages first: it carries a foreign key to ai_conversations. `cascade`
-- would do it in either order, but naming the dependency is better than
-- relying on the keyword to sweep up something unlisted.

drop table if exists public.ai_messages;
drop table if exists public.ai_conversations;
drop table if exists public.ai_recommendations;

-- The RLS policies (ai_conversations_own, ai_messages_own_select,
-- ai_recommendations_own) and the indexes go with their tables. No separate
-- drops needed, and no `drop policy if exists` that would fail on a table
-- that is already gone.

-- WHAT IS DELIBERATELY LEFT
--
-- notification_preferences.ai_recovery_alerts stays. It is a plain boolean
-- holding its own default for five rows, the "AI suggestions" switch that set
-- it is gone from the app, the ai_suggestion push kind that read it is gone
-- from send-push, and it is out of types/database.ts so no new code can write
-- to it. Dropping a populated column to tidy a name it no longer answers to
-- is a worse trade than leaving it inert. If it is ever worth removing, it is
-- a one-line migration of its own with nothing depending on the timing.
