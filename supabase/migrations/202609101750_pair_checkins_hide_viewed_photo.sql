-- Once a photo has been viewed (or the cleanup sweep has deleted it), stop
-- returning its path here too - the pair timeline keeps the check-in entry
-- itself (the log line, note, and timestamp are not ephemeral, only the
-- photo is), it just stops showing a thumbnail for it. Applies uniformly
-- regardless of which of the two people is asking, matching "gone for
-- everyone once viewed."
create or replace function public.get_pair_checkins(p_user_id uuid, p_limit int default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_partner_id uuid;
  v_state text;
begin
  if auth.uid() is not null and auth.uid() <> p_user_id then
    raise exception 'not your timeline';
  end if;

  select partner_user_id, partner_state into v_partner_id, v_state
  from public.user_challenges
  where user_id = p_user_id and status = 'active'
  order by started_at desc
  limit 1;

  return coalesce((
    select jsonb_agg(row_to_json(t) order by t.completed_at desc)
    from (
      select
        tc.id,
        uc.user_id,
        p.full_name as name,
        p.avatar_url,
        ct.title as task_title,
        tc.note,
        case when tc.photo_viewed_at is null then tc.photo_path else null end as photo_path,
        tc.completed_at
      from public.task_checkins tc
      join public.challenge_tasks ct on ct.id = tc.challenge_task_id
      join public.user_challenges uc on uc.id = tc.user_challenge_id
      join public.profiles p on p.id = uc.user_id
      where tc.status = 'completed'
        and (
          uc.user_id = p_user_id
          or (v_partner_id is not null and v_state = 'partnered' and uc.user_id = v_partner_id)
        )
      order by tc.completed_at desc
      limit p_limit
    ) t
  ), '[]'::jsonb);
end;
$$;
