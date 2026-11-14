-- The partner's profile on Find (#203, 13 Nov 2026): get_my_partner() also
-- returns the partner's photo status, the areas they picked, and their Why
-- answers. Additive only: every existing key is unchanged, so an older build
-- keeps working. Still a confirmed partner only; a match offer or a stranger
-- never reaches this function's data.

create or replace function public.get_my_partner()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  p public.partnerships;
  v_other uuid;
  v_mine uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select * into p from public.partnerships
  where state = 'active' and v_uid in (user_a, user_b)
  limit 1;
  if p.id is null then
    return jsonb_build_object('partnered', false);
  end if;
  v_other := case when p.user_a = v_uid then p.user_b else p.user_a end;

  -- A challenge of MINE that still names this partner: the live one if there
  -- is one, otherwise the most recent. Block and report take a challenge id,
  -- and they must stay reachable between challenges.
  select uc.id into v_mine
  from public.user_challenges uc
  where uc.user_id = v_uid and uc.partner_user_id = v_other
  order by (uc.status in ('active', 'pending', 'paused')) desc, uc.started_at desc nulls last
  limit 1;

  return jsonb_build_object(
    'partnered', true,
    'first_name', (select split_part(coalesce(full_name, 'Your partner'), ' ', 1) from public.profiles where id = v_other),
    'avatar_url', (select avatar_url from public.profiles where id = v_other),
    'since', p.started_at,
    'my_challenge_id', v_mine,
    -- What the pair is paired ON: my live activity, else theirs.
    'paired_on', coalesce(
      (select coalesce(nullif(btrim(uc.custom_habit_title), ''), t.title)
       from public.user_challenges uc left join public.challenge_templates t on t.id = uc.challenge_template_id
       where uc.user_id = v_uid and uc.status in ('active', 'pending', 'paused')
       order by uc.started_at desc nulls last limit 1),
      (select coalesce(nullif(btrim(uc.custom_habit_title), ''), t.title)
       from public.user_challenges uc left join public.challenge_templates t on t.id = uc.challenge_template_id
       where uc.user_id = v_other and uc.status in ('active', 'pending', 'paused')
       order by uc.started_at desc nulls last limit 1)),
    'i_have_challenge', exists (
      select 1 from public.user_challenges uc
      where uc.user_id = v_uid and uc.status in ('active', 'pending', 'paused')),
    'partner_has_challenge', exists (
      select 1 from public.user_challenges uc
      where uc.user_id = v_other and uc.status in ('active', 'pending', 'paused')),
    -- The heart: sessions both completed, with THIS partner.
    'sessions_together', (
      select count(*) from public.pair_plans pl
      where pl.status = 'completed'
        and least(pl.user_a, pl.user_b) = p.user_a
        and greatest(pl.user_a, pl.user_b) = p.user_b),
    -- For the partner's profile on Find (#203, 13 Nov 2026). Only ever
    -- returned to a confirmed partner, which this function already is.
    'user_id', v_other,
    'photo_confirmed', coalesce((select photo_status = 'photo_confirmed' from public.profiles where id = v_other), false),
    -- The areas they picked to meet in, by name, from their live challenge.
    'area', (
      select nullif(concat_ws(', ', l1.label, l2.label), '')
      from public.user_challenges uc
      left join public.locations l1 on l1.value = uc.preferred_location
      left join public.locations l2 on l2.value = uc.preferred_location_2
      where uc.user_id = v_other and uc.status in ('active', 'pending', 'paused')
      order by uc.started_at desc nulls last limit 1),
    -- Their Why answers, which a confirmed partner may read (202608131600).
    'why', coalesce((
      select jsonb_agg(jsonb_build_object(
               'question_key', r.question_key, 'choice_key', r.choice_key, 'custom_text', r.custom_text)
             order by array_position(array['purpose', 'matters', 'gain', 'lose'], r.question_key))
      from (
        select distinct on (question_key) question_key, choice_key, custom_text
        from public.challenge_reflections
        where user_id = v_other
        order by question_key, updated_at desc
      ) r), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.get_my_partner() from public, anon;
grant execute on function public.get_my_partner() to authenticated;
