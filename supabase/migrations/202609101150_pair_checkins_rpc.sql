-- PartnerStatus (features/community/api.ts) is aggregate-only - "checked in
-- today: yes/no" - there was no per-event list of check-ins to interleave for
-- a pair timeline. This RPC returns individual task_checkins rows for the
-- caller and (if partnered) their partner, newest first.
--
-- Returns photo_path only, never a signed URL - the client signs it the same
-- way PartnerProof.tsx already does. That only works for matched (non-invite)
-- pairs once is_partner_of() (202609101100) is applied.
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
        tc.photo_path,
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

grant execute on function public.get_pair_checkins(uuid, int) to authenticated, service_role;

create index if not exists task_checkins_completed_at_idx
  on public.task_checkins (completed_at desc);
