-- Check-in photos should be ephemeral: once the partner has seen one, it goes
-- away for everyone, and even an unviewed one doesn't sit in storage forever.
-- This column is the "has the partner seen this" clock the rest of the
-- feature reads and writes.
alter table public.task_checkins
  add column if not exists photo_viewed_at timestamptz;

-- The cleanup sweep's whole query is "photo present AND (viewed OR stale)" -
-- a partial index scoped to rows that actually have a photo keeps that cheap
-- as the table grows, rather than scanning every check-in ever made.
create index if not exists task_checkins_photo_cleanup_idx
  on public.task_checkins (photo_viewed_at, created_at)
  where photo_path is not null;
