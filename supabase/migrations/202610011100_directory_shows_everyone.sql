-- "Already on the move" shows everyone with an active challenge.
--
-- 202609231500 gated the directory twice: a person appeared only after opting
-- in (profiles.show_in_directory, default false), and the whole list was
-- withheld below five rows. Decided 29 September and restated in the 1 October
-- testing pass: BOTH GO. "Everyone registered is shown by default. A new user
-- has to see the app is alive." With the gates on, every one of the 879 live
-- profiles is opted out and the screen is empty for everybody.
--
-- What a row exposes is unchanged and deliberately small: first name, avatar,
-- activity, amount and cadence. No location, no last name, no user id.
-- Blocks still hide people from each other in both directions.
--
-- NOT DECIDED HERE, and it needs deciding before this is applied to a real
-- database: profiles.show_in_directory and set_show_in_directory() still
-- exist, and Settings still shows the "Who else is here" switch that writes
-- them. After this migration that switch does nothing. Either it is removed
-- from Settings in the same release, or it becomes an opt-OUT and this
-- function goes back to honouring it. Left in place rather than guessed at.

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
  v_count int;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

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
      uc.started_at
    from public.user_challenges uc
    join public.profiles p on p.id = uc.user_id
    join public.challenge_templates t on t.id = uc.challenge_template_id
    where uc.status = 'active'
      and uc.user_id <> v_uid
      -- Blocks hide people from each other here too, in both directions.
      and not exists (
        select 1 from public.user_blocks b
        where (b.blocker_id = v_uid and b.blocked_id = uc.user_id)
           or (b.blocker_id = uc.user_id and b.blocked_id = v_uid)
      )
    order by uc.user_id, uc.started_at desc
  )
  select count(*),
         coalesce(jsonb_agg(jsonb_build_object(
           'first_name', first_name,
           'avatar_url', avatar_url,
           'activity', activity,
           'commitment_value', commitment_value,
           'unit', unit,
           'days_per_week', days_per_week
         ) order by started_at desc), '[]'::jsonb)
    into v_count, v_rows
  from (select * from listed order by started_at desc limit 100) l;

  -- No floor and no opt-in any more (see the header). `visible` and
  -- `me_listed` stay in the payload, both true, so a client built against the
  -- old shape keeps working instead of rendering "withheld".
  return jsonb_build_object('visible', true, 'me_listed', true, 'rows', v_rows);
end;
$$;

revoke all on function public.get_active_directory() from public, anon;
grant execute on function public.get_active_directory() to authenticated;
