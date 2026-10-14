-- One live challenge per user, and a deterministic answer when reading it.
--
-- #132: changing your activity appeared to work and then did not. Confirmed on
-- production, 13 October: one account held THREE live user_challenges rows,
-- all with the identical started_at (2026-09-18T12:41:49.100Z) — two pointing
-- at Workouts, one at Running, and one of them carrying partner_state
-- 'invited' that the app had never shown.
--
-- `order by started_at desc limit 1` has no defined answer over an exact tie.
-- Postgres returns whichever row it reaches first, and that can CHANGE after an
-- UPDATE because the updated tuple relocates in the heap. So the write landed
-- on one row and the card read another.
--
-- The client fix (features/challenges/api.ts) adds the same `id` tie-break to
-- getMyChallenge and stops setMyChallengeHabit returning without writing. This
-- migration fixes the two places the database itself was ambiguous.
--
-- PRE-REQUISITE: the unique index below FAILS while any user still holds more
-- than one live row. Resolve duplicates first:
--
--   select user_id, count(*) from public.user_challenges
--   where status in ('active','pending','paused')
--   group by user_id having count(*) > 1;
--
-- As of 13 October exactly one account was affected (884 live rows, 882 users).

-- 1. The same tie-break inside ensure_user_challenge. Re-issued from
--    202609182000 with the live body unchanged except `order by`, per the
--    repo's convention of copying the whole body rather than patching it.
create or replace function public.ensure_user_challenge(
  p_user_id uuid,
  p_template_id uuid default null,
  p_custom_habit_title text default null,
  p_force_new boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing uuid;
  v_template uuid;
  v_custom text := nullif(btrim(coalesce(p_custom_habit_title, '')), '');
  v_id uuid;
  v_title text;
begin
  if not p_force_new then
    select id into v_existing from public.user_challenges
    where user_id = p_user_id and status in ('active', 'pending', 'paused')
    -- The tie-break (#132). Without it this and getMyChallenge could resolve
    -- to DIFFERENT rows for the same user in the same second.
    order by started_at desc, id desc limit 1;
    if v_existing is not null then return v_existing; end if;
  end if;

  select coalesce(p_template_id,
    (select id from public.challenge_templates where is_active order by sort_order, created_at limit 1))
  into v_template;
  if v_template is null then return null; end if;

  insert into public.user_challenges(
    user_id, challenge_template_id, accountability_mode, status, ends_at,
    custom_habit_title, partner_state)
  values (
    p_user_id, v_template, 'solo', 'active', now() + interval '7 days',
    v_custom, 'solo')
  returning id into v_id;

  select title into v_title from public.challenge_templates where id = v_template;
  insert into public.challenge_tasks(user_challenge_id, title, sort_order, due_window)
  values (v_id, coalesce(v_custom, v_title, 'Complete today''s habit'), 1, 'anytime');
  return v_id;
end;
$$;

grant execute on function public.ensure_user_challenge(uuid, uuid, text, boolean) to authenticated;

-- 2. Make a second live row impossible, so the tie can never recur.
--
--    Partial, because finished and abandoned challenges are history and a user
--    accumulates many of them. p_force_new on ensure_user_challenge is the
--    documented way to start another one; it must now close the current one
--    first, which is the behaviour the product always described.
create unique index if not exists user_challenges_one_live_per_user
  on public.user_challenges (user_id)
  where status in ('active', 'pending', 'paused');

notify pgrst, 'reload schema';
