-- The invite code's prefix is the ACTIVITY, not the first letters of the slug.
--
-- 202609291300 took the prefix from challenge_templates.slug, expecting slugs
-- like 'running'. The live slugs are 'onboarding-run-1-mile',
-- 'onboarding-yoga-15min', 'activity-cycling', so every code came out as
-- ONB... or ACT... . Found by generating one against the live database on
-- 1 October: ONBBH7 for a running challenge, where the spec says RUN4K7.
--
-- Now: the activity key where the template has one, with Workouts spelled out
-- (the key is 'home_workouts', which would give HOM). Otherwise the slug with
-- its 'onboarding-' or 'activity-' namespace stripped, and CHO as before when
-- that leaves fewer than three letters.
--
-- Only codes generated from now on change. The one existing invite is already
-- accepted and keeps whatever it has.

create or replace function public.invite_code_prefix(p_user_challenge_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    case ct.activity_key
      when 'home_workouts' then 'WOR'
      else nullif(upper(substring(regexp_replace(coalesce(ct.activity_key, ''), '[^a-zA-Z]', '', 'g') from 1 for 3)), '')
    end,
    (select p from (
       select upper(substring(
         regexp_replace(regexp_replace(coalesce(ct.slug, ''), '^(onboarding|activity)-', ''), '[^a-zA-Z]', '', 'g')
         from 1 for 3)) as p
     ) s where length(s.p) = 3),
    'CHO'
  )
  from public.user_challenges uc
  left join public.challenge_templates ct
    on ct.id = uc.challenge_template_id
  where uc.id = p_user_challenge_id;
$$;
