-- SCHEMA_CHALLENGES.md §8 item 1: an invitee who already has an active
-- challenge enters a code. Ask, then replace.
--
-- That was the recommendation on record ("ask-then-replace, and block outright
-- if already partnered") and it had never been built. The second half landed
-- in 202610011200. The first half was being resolved silently, which is the
-- one thing §8 says not to do: accept_challenge_invite() overwrites the
-- invitee's challenge with the inviter's activity and says nothing.
--
-- The server cannot ask a question, so it answers one instead. preview_invite()
-- tells the app what accepting WOULD do, the app asks the person, and only a
-- yes calls accept_invite_by_code(). Read-only: it changes nothing, and it
-- never returns the inviter's last name, email or id.

create or replace function public.preview_invite(p_code text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_input text := public.normalize_invite_code(p_code);
  i record;
  v_their_uc uuid;
  v_their_template uuid;
  v_their_custom text;
  v_activity text;
  mine record;
  v_replaces text;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  if v_input is null then
    return jsonb_build_object('found', false);
  end if;

  select * into i from public.challenge_invites
  where code = v_input or token = p_code
  limit 1;
  if i.id is null then
    return jsonb_build_object('found', false);
  end if;

  -- The inviter's challenge, the same way accept_challenge_invite() finds it.
  v_their_uc := i.user_challenge_id;
  if v_their_uc is null then
    select id into v_their_uc from public.user_challenges
    where user_id = i.invited_by and status in ('active', 'pending', 'paused')
    order by started_at desc limit 1;
  end if;
  select uc.challenge_template_id, nullif(btrim(uc.custom_habit_title), '')
    into v_their_template, v_their_custom
  from public.user_challenges uc where uc.id = v_their_uc;
  select coalesce(v_their_custom, t.title) into v_activity
  from public.challenge_templates t where t.id = v_their_template;

  -- My current challenge, and whether accepting would change what it is.
  select uc.id, uc.challenge_template_id, nullif(btrim(uc.custom_habit_title), '') as custom,
         coalesce(nullif(btrim(uc.custom_habit_title), ''), t.title) as title
    into mine
  from public.user_challenges uc
  left join public.challenge_templates t on t.id = uc.challenge_template_id
  where uc.user_id = v_uid and uc.status in ('active', 'pending', 'paused')
  order by uc.started_at desc limit 1;

  if mine.id is not null
     and (mine.challenge_template_id is distinct from v_their_template
          or mine.custom is distinct from v_their_custom) then
    v_replaces := mine.title;
  end if;

  return jsonb_build_object(
    'found', true,
    'own', i.invited_by = v_uid,
    'status', i.status,
    'mine', i.status = 'accepted' and i.accepted_by = v_uid,
    'expired', i.status = 'pending' and i.expires_at is not null and now() > i.expires_at,
    'expires_at', i.expires_at,
    'inviter_first_name', (select split_part(coalesce(full_name, 'Your friend'), ' ', 1)
                           from public.profiles where id = i.invited_by),
    'activity', v_activity,
    -- The name of the challenge that would be REPLACED, or null when accepting
    -- changes nothing about what the person is doing.
    'replaces', v_replaces,
    'blocked', case
      when public.has_other_active_partner(v_uid, i.invited_by) then 'you_partnered'
      when public.has_other_active_partner(i.invited_by, v_uid) then 'they_partnered'
      else null end
  );
end;
$$;

revoke all on function public.preview_invite(text) from public, anon;
grant execute on function public.preview_invite(text) to authenticated;
