-- Supabase's security advisor flags get_user_insights for a mutable
-- search_path (it always has, this predates the streak fix) - every other
-- security-definer function touched this cycle already pins search_path, so
-- closing this one too costs one line while we're already here.
alter function public.get_user_insights(uuid) set search_path = public;
