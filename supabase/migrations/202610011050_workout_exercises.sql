-- Workouts: up to four exercises, and they do not match.
--
-- Decided in the 1 October testing pass (DECISIONS_LOG, item 9). Challenge
-- creation asks a Workouts commitment for UP TO FOUR exercises. They are
-- colour, not criteria: shown on the person's card and on workout rows in the
-- directory, and never sent to matching, which reads the activity and the
-- duration only. get_match_pool() is deliberately NOT touched by this file.
--
-- Free text rather than an enum: the list of exercises is a UI concern and is
-- still moving, and nothing server-side branches on a value.

alter table public.user_challenges
  add column if not exists exercises text[] not null default '{}';

alter table public.user_challenges
  drop constraint if exists user_challenges_exercises_check;
alter table public.user_challenges
  add constraint user_challenges_exercises_check
  check (cardinality(exercises) <= 4);

comment on column public.user_challenges.exercises is
  'Up to four exercises on a Workouts commitment. Descriptive only: shown on '
  'the card and in the directory, never read by matching.';

-- One way in, so the two rules live in one place:
--   - Workouts only. On any other activity the list would be stale colour.
--   - Editable until a search starts, exactly like the activity. Once
--     partner_state is anything but solo the commitment is locked.
create or replace function public.set_challenge_exercises(
  p_user_challenge_id uuid,
  p_exercises text[]
)
returns text[]
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_state text;
  v_activity text;
  v_clean text[];
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select uc.partner_state, t.activity_key
    into v_state, v_activity
  from public.user_challenges uc
  left join public.challenge_templates t on t.id = uc.challenge_template_id
  where uc.id = p_user_challenge_id and uc.user_id = v_uid;

  if v_state is null then
    raise exception 'challenge not found';
  end if;
  if v_state <> 'solo' then
    raise exception 'Locked while you''re looking for a match';
  end if;
  if v_activity is distinct from 'home_workouts' then
    raise exception 'Exercises only apply to a workout';
  end if;

  -- Trimmed, blanks dropped, duplicates removed, order kept.
  select coalesce(array_agg(x.e order by x.first_at), '{}')
    into v_clean
  from (
    select btrim(e) as e, min(ord) as first_at
    from unnest(coalesce(p_exercises, '{}')) with ordinality as u(e, ord)
    where btrim(coalesce(e, '')) <> ''
    group by btrim(e)
  ) x;

  if cardinality(v_clean) > 4 then
    raise exception 'Pick up to four exercises';
  end if;
  if exists (select 1 from unnest(v_clean) e where length(e) > 40) then
    raise exception 'That exercise name is too long';
  end if;

  update public.user_challenges
  set exercises = v_clean
  where id = p_user_challenge_id;

  return v_clean;
end;
$$;

revoke all on function public.set_challenge_exercises(uuid, text[]) from public, anon;
grant execute on function public.set_challenge_exercises(uuid, text[]) to authenticated;
