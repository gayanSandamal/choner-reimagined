-- "Already on the move" shows everyone with an active challenge, unless they
-- have asked not to be shown.
--
-- 202609231500 gated the directory twice: a person appeared only after opting
-- IN (profiles.show_in_directory, default false), and the whole list was
-- withheld below five rows. Decided 29 September and restated in the 1 October
-- testing pass: both go. "Everyone registered is shown by default. A new user
-- has to see the app is alive." With the gates on, every one of the 879 live
-- profiles is opted out and the screen is empty for everybody.
--
-- "By default" is the operative phrase, so this becomes an opt-OUT rather than
-- nothing at all. The directory screen already has a switch, and a switch that
-- silently does nothing would be worse than either choice. The old column
-- cannot carry the new meaning: its `false` is the default nobody chose, so it
-- cannot tell "never asked" from "said no". A new column can:
--
--   hide_from_directory   default false. True only when the person turned
--                         themselves off after this migration.
--
-- set_show_in_directory(p_show) keeps its name and signature, so the existing
-- switch works unchanged, and now writes the new column.
--
-- What a row exposes is still deliberately small: first name, avatar,
-- activity, amount and cadence, plus exercises on workout rows only (the one
-- place they appear, 202610011050). No location, no last name, no user id.
-- Blocks still hide people from each other in both directions.

alter table public.profiles
  add column if not exists hide_from_directory boolean not null default false;

comment on column public.profiles.hide_from_directory is
  'Opt-out from "Already on the move". Replaces the opt-in show_in_directory, '
  'whose default false could not tell "never asked" from "said no".';

create or replace function public.set_show_in_directory(p_show boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  update public.profiles
  set hide_from_directory = not coalesce(p_show, true),
      -- Kept in step so anything still reading the old column agrees.
      show_in_directory = coalesce(p_show, true)
  where id = auth.uid();
end;
$$;

revoke all on function public.set_show_in_directory(boolean) from public, anon;
grant execute on function public.set_show_in_directory(boolean) to authenticated;

create or replace function public.get_active_directory()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_rows jsonb;
  v_me boolean;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select not coalesce(hide_from_directory, false) into v_me
  from public.profiles where id = v_uid;

  -- One row per person: their most recently started active challenge.
  with listed as (
    select distinct on (uc.user_id)
      uc.user_id,
      split_part(coalesce(p.full_name, 'Someone'), ' ', 1) as first_name,
      p.avatar_url,
      coalesce(nullif(btrim(uc.custom_habit_title), ''), t.title) as activity,
      uc.commitment_value,
      t.unit,
      uc.days_per_week,
      -- Workout rows only. Anywhere else a leftover list would be stale.
      case when t.activity_key = 'home_workouts' then to_jsonb(uc.exercises)
           else '[]'::jsonb end as exercises,
      uc.started_at
    from public.user_challenges uc
    join public.profiles p on p.id = uc.user_id
    join public.challenge_templates t on t.id = uc.challenge_template_id
    where uc.status = 'active'
      and not p.hide_from_directory
      and uc.user_id <> v_uid
      -- Blocks hide people from each other here too, in both directions.
      and not exists (
        select 1 from public.user_blocks b
        where (b.blocker_id = v_uid and b.blocked_id = uc.user_id)
           or (b.blocker_id = uc.user_id and b.blocked_id = v_uid)
      )
    order by uc.user_id, uc.started_at desc
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'first_name', first_name,
           'avatar_url', avatar_url,
           'activity', activity,
           'commitment_value', commitment_value,
           'unit', unit,
           'days_per_week', days_per_week,
           'exercises', exercises
         ) order by started_at desc), '[]'::jsonb)
    into v_rows
  from (select * from listed order by started_at desc limit 100) l;

  -- No floor any more. `visible` stays in the payload, always true, so a
  -- client built against the old shape keeps working instead of rendering
  -- "withheld".
  return jsonb_build_object('visible', true, 'me_listed', coalesce(v_me, true), 'rows', v_rows);
end;
$$;

revoke all on function public.get_active_directory() from public, anon;
grant execute on function public.get_active_directory() to authenticated;
