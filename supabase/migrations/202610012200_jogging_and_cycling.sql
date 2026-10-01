-- Six activities: Running, Jogging, Walking, Cycling, Yoga, Workouts.
--
-- Listed that way in the master spec, the frontend plan and the 1 October
-- testing pass. The database had four of them pickable: there was no Jogging
-- at all, the activity_key check did not allow the value, and Cycling had been
-- added switched off on 18 September because nothing offered it yet.
--
-- Jogging is its own activity, not an alias of Running: the list names both,
-- and matching pairs on the activity, so a jogger is matched with joggers.
-- It is measured in distance like Running, Walking and Cycling.
--
-- NOT done here: the older goal-derived habits ("Run 1 mile", "20 push-ups",
-- "Journaling") are left exactly as they are. Whether the picker shows six
-- activities INSTEAD of those is the activity model behind the Create a
-- commitment screen, and retiring a template people are on is not something
-- to do as a side effect.

alter table public.challenge_templates
  drop constraint if exists challenge_templates_activity_key_check;
alter table public.challenge_templates
  add constraint challenge_templates_activity_key_check
  check (activity_key is null or activity_key in
    ('running', 'jogging', 'home_workouts', 'cycling', 'yoga', 'walking', 'badminton'));

insert into public.challenge_templates
  (title, slug, category, duration_days, difficulty, summary, description, sort_order,
   proof_type, is_active, activity_key, metric_type, unit, default_target, beginner_options)
values
  ('Jogging', 'activity-jogging', 'movement', 7, 'beginner',
   'An easy jog, at a pace you could hold a conversation at.',
   'An easy jog, at a pace you could hold a conversation at.', 14, 'tap', true,
   'jogging', 'distance', 'km', 2,
   '[{"value":1,"label":"1 km"},{"value":2,"label":"2 km"},{"value":3,"label":"3 km"},{"value":null,"label":"Not sure"}]'::jsonb)
on conflict (slug) do nothing;

update public.challenge_templates
set is_active = true
where slug in ('activity-cycling', 'activity-jogging');

-- A jogging pair can plan a session like the other distance activities.
-- Re-issued from 202609231700 with 'jogging' added to the list.
create or replace function public.start_meetup_plan(p_user_challenge_id uuid)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid(); uc record; v_partner_uc uuid; v_plan uuid; v_key text;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select * into uc from public.user_challenges
  where id = p_user_challenge_id and user_id = v_uid and partner_state = 'partnered';
  if uc.id is null then return jsonb_build_object('ok', false, 'reason', 'no_partner'); end if;
  select activity_key into v_key from public.challenge_templates where id = uc.challenge_template_id;
  if coalesce(v_key, '') not in ('running', 'jogging', 'walking', 'cycling') then
    return jsonb_build_object('ok', false, 'reason', 'not_supported');
  end if;
  select id into v_partner_uc from public.user_challenges
  where user_id = uc.partner_user_id and partner_user_id = v_uid and partner_state = 'partnered'
  order by started_at desc nulls last limit 1;

  insert into public.pair_plans (user_a, user_b, challenge_a, challenge_b, template_id, activity_key,
                                 kind, opener_id, mode)
  values (v_uid, uc.partner_user_id, uc.id, v_partner_uc, uc.challenge_template_id, v_key,
          'meetup', v_uid,
          public.resolve_pair_mode(uc.mode, (select mode from public.user_challenges where id = v_partner_uc)))
  on conflict do nothing
  returning id into v_plan;
  if v_plan is null then return jsonb_build_object('ok', false, 'reason', 'already_planning'); end if;
  insert into public.pair_plan_members (plan_id, user_id) values (v_plan, v_uid), (v_plan, uc.partner_user_id);
  return jsonb_build_object('ok', true);
end; $$;

revoke all on function public.start_meetup_plan(uuid) from public, anon;
grant execute on function public.start_meetup_plan(uuid) to authenticated;
