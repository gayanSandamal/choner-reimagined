-- History: finished challenges, with the score each one ended on.
--
-- "Ended · 7 of 12 · September 2026." Ending a challenge ends its streak at
-- the current score and saves it to history (SCHEMA_CHALLENGES.md §7). There
-- is nothing to save: the score is the challenge's own sessions, counted. But
-- nothing returned it, and the client's history read came back with a title
-- and a date only.
--
-- `done` counts the same way get_streak() does: a session both completed, or a
-- missed one that was made up. Repair sessions are not counted on their own.
-- `target` is null for a challenge that ended before a streak was picked,
-- which is every challenge from the daily model.

create or replace function public.get_challenge_history()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(to_jsonb(h) order by h.ended_at desc nulls last), '[]'::jsonb)
  from (
    select
      uc.id,
      coalesce(nullif(btrim(uc.custom_habit_title), ''), t.title) as title,
      uc.status,
      coalesce(uc.completed_at, uc.ends_at, uc.started_at) as ended_at,
      uc.target_sessions as target,
      (
        select count(*) from public.pair_plans p
        where uc.id in (p.challenge_a, p.challenge_b)
          and not p.is_repair
          and (
            p.status = 'completed'
            or (p.status = 'missed' and exists (
                  select 1 from public.pair_plans r
                  where r.repairs_plan_id = p.id and r.status = 'completed'))
          )
      ) as done
    from public.user_challenges uc
    left join public.challenge_templates t on t.id = uc.challenge_template_id
    where uc.user_id = auth.uid()
      and uc.status in ('completed', 'abandoned')
    order by coalesce(uc.completed_at, uc.ends_at, uc.started_at) desc nulls last
    limit 30
  ) h;
$$;

revoke all on function public.get_challenge_history() from public, anon;
grant execute on function public.get_challenge_history() to authenticated;
