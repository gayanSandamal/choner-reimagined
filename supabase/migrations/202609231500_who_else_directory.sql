-- "Who else is here" (handover §2.6), decided 2026-09-23 as D5: OPT-IN,
-- hidden below five people.
--
-- The handover listed everyone with an active challenge automatically. That
-- conflicts with a confirmed rule (Verification Features §4: anything beyond
-- the pair is opt-in) and, in an app that arranges meetups between strangers,
-- a browsable list of faces, first names and routines ("Running · 5 km,
-- daily") is a safety surface. So nobody appears until they say so.
--
-- Read-only by design: no profile tap-through, no messaging, no matching. The
-- function returns nothing an attacker could use to reach someone — no ids,
-- no location, no city.

alter table public.profiles
  add column if not exists show_in_directory boolean not null default false;

create or replace function public.directory_min_rows()
returns int language sql immutable as $$ select 5 $$;

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
  v_me boolean;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select coalesce(show_in_directory, false) into v_me from public.profiles where id = v_uid;

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
      and p.show_in_directory
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

  -- Below the floor the list is withheld entirely, not just hidden by the
  -- client: two rows would make each person trivially identifiable.
  if v_count < public.directory_min_rows() then
    return jsonb_build_object('visible', false, 'me_listed', v_me, 'rows', '[]'::jsonb);
  end if;

  return jsonb_build_object('visible', true, 'me_listed', v_me, 'rows', v_rows);
end;
$$;

revoke all on function public.get_active_directory() from public, anon;
grant execute on function public.get_active_directory() to authenticated;

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
  update public.profiles set show_in_directory = coalesce(p_show, false) where id = auth.uid();
end;
$$;

revoke all on function public.set_show_in_directory(boolean) from public, anon;
grant execute on function public.set_show_in_directory(boolean) to authenticated;

notify pgrst, 'reload schema';
