-- Phase 2 — the Home "Where are you starting from?" prompt.
--
-- Framing rule from the spec: this is NOT "complete your setup". That wording
-- implies unfinished admin and gets dismissed. It is a new, forward-looking
-- question, and it is dismissable but re-surfaces once per DAY (not per
-- session — that's nagging), which is why the stamp below is a date rather
-- than a boolean.
--
-- The beginner branch is the point of the whole thing: someone who answers
-- "I'm new to this" is never asked to invent a capability number. They get a
-- starting point instead, and their real capability is backfilled from their
-- first actual check-in (Phase 3).

alter table public.user_challenges
  add column if not exists starting_point_prompted_on date;

-- ============================================================
-- get_starting_point_status
-- ============================================================
create or replace function public.get_starting_point_status(p_user_challenge_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_owner uuid;
  v_tz text;
  v_today date;
  v_prompted_on date;
  v_capability numeric;
  v_beginner numeric;
  v_commitment numeric;
  v_template record;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select uc.user_id, uc.capability_value, uc.beginner_start_value,
         uc.commitment_value, uc.starting_point_prompted_on
  into v_owner, v_capability, v_beginner, v_commitment, v_prompted_on
  from public.user_challenges uc
  where uc.id = p_user_challenge_id;

  if v_owner is null then
    return jsonb_build_object('needs_prompt', false);
  end if;
  if v_owner <> v_uid then
    raise exception 'not your challenge';
  end if;

  select coalesce(timezone, 'UTC') into v_tz from public.profiles where id = v_uid;
  v_today := (now() at time zone coalesce(v_tz, 'UTC'))::date;

  select t.activity_key, t.metric_type, t.unit, t.default_target, t.beginner_options
  into v_template
  from public.user_challenges uc
  join public.challenge_templates t on t.id = uc.challenge_template_id
  where uc.id = p_user_challenge_id;

  return jsonb_build_object(
    -- Answered once = answered forever. commitment_value is the marker: a
    -- beginner legitimately leaves capability_value null, so keying off
    -- capability would re-ask them every day.
    'needs_prompt', v_commitment is null
                    and (v_prompted_on is null or v_prompted_on < v_today),
    'answered', v_commitment is not null,
    'capability_value', v_capability,
    'beginner_start_value', v_beginner,
    'commitment_value', v_commitment,
    'metric_type', v_template.metric_type,
    'unit', v_template.unit,
    'default_target', v_template.default_target,
    'beginner_options', coalesce(v_template.beginner_options, '[]'::jsonb),
    'activity_key', v_template.activity_key
  );
end;
$$;

grant execute on function public.get_starting_point_status(uuid) to authenticated;

-- ============================================================
-- set_starting_point
--
-- p_capability null + p_beginner_start set = the "I'm new to this" branch.
-- Passing all three as null is a dismiss: it only stamps the date so the
-- prompt comes back tomorrow rather than later today.
-- ============================================================
create or replace function public.set_starting_point(
  p_user_challenge_id uuid,
  p_capability numeric default null,
  p_beginner_start numeric default null,
  p_commitment numeric default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_owner uuid;
  v_tz text;
  v_today date;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select user_id into v_owner
  from public.user_challenges where id = p_user_challenge_id;

  if v_owner is null then
    raise exception 'challenge not found';
  end if;
  if v_owner <> v_uid then
    raise exception 'not your challenge';
  end if;

  select coalesce(timezone, 'UTC') into v_tz from public.profiles where id = v_uid;
  v_today := (now() at time zone coalesce(v_tz, 'UTC'))::date;

  update public.user_challenges
  set capability_value = coalesce(p_capability, capability_value),
      beginner_start_value = coalesce(p_beginner_start, beginner_start_value),
      commitment_value = coalesce(p_commitment, commitment_value),
      starting_point_prompted_on = v_today
  where id = p_user_challenge_id;
end;
$$;

grant execute on function public.set_starting_point(uuid, numeric, numeric, numeric) to authenticated;
