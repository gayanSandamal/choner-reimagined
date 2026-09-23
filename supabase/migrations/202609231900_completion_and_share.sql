-- P7: completion (handover §3.17-3.18) — reactions and Share to inspire.
--
-- Sharing is recorded in its own table rather than in milestones: the
-- milestones unique key is (sharer, challenge, kind), which allows one post per
-- kind per challenge, while this prompt fires after EVERY session together.
-- Changing that key would break the upsert in every app build already
-- installed. And a pair post needs both partners' yes (D9) — the partner is
-- never posted without being asked.

create table if not exists public.plan_reactions (
  plan_id uuid not null references public.pair_plans(id) on delete cascade,
  from_user uuid not null references auth.users(id) on delete cascade,
  reaction text not null check (reaction in ('Nice', 'Keep going', 'Proud of you', 'I''m next', 'Send a lift')),
  created_at timestamptz not null default now(),
  primary key (plan_id, from_user, reaction)
);
alter table public.plan_reactions enable row level security;

create table if not exists public.session_shares (
  plan_id uuid not null references public.pair_plans(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  -- false still writes: "Not now" is an answer, and it stops the asking.
  shared boolean not null,
  created_at timestamptz not null default now(),
  primary key (plan_id, user_id)
);
alter table public.session_shares enable row level security;

-- Reactions exist only once BOTH showed up (state B).
create or replace function public.toggle_plan_reaction(p_plan_id uuid, p_reaction text)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare v_uid uuid := auth.uid(); p public.pair_plans;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  p := public.my_plan_member(p_plan_id);
  if p.id is null or p.status <> 'completed' then return jsonb_build_object('ok', false, 'reason', 'not_both_done'); end if;
  if p_reaction not in ('Nice', 'Keep going', 'Proud of you', 'I''m next', 'Send a lift') then
    return jsonb_build_object('ok', false, 'reason', 'bad_reaction');
  end if;
  delete from public.plan_reactions where plan_id = p.id and from_user = v_uid and reaction = p_reaction;
  if not found then
    insert into public.plan_reactions (plan_id, from_user, reaction) values (p.id, v_uid, p_reaction);
  end if;
  return jsonb_build_object('ok', true);
end; $$;

create or replace function public.record_session_share(p_plan_id uuid, p_shared boolean)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare v_uid uuid := auth.uid(); p public.pair_plans;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  p := public.my_plan_member(p_plan_id);
  if p.id is null or p.status <> 'completed' then return jsonb_build_object('ok', false, 'reason', 'not_both_done'); end if;
  insert into public.session_shares (plan_id, user_id, shared) values (p.id, v_uid, coalesce(p_shared, false))
  on conflict (plan_id, user_id) do nothing;
  return jsonb_build_object('ok', true);
end; $$;

revoke all on function public.toggle_plan_reaction(uuid, text) from public, anon;
grant execute on function public.toggle_plan_reaction(uuid, text) to authenticated;
revoke all on function public.record_session_share(uuid, boolean) from public, anon;
grant execute on function public.record_session_share(uuid, boolean) to authenticated;

drop function if exists public.get_city_feed(int);
create or replace function public.get_city_feed(p_limit int default 30, p_include_sessions boolean default false)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_city text;
  v_rows jsonb;
begin
  if v_uid is null then
    return jsonb_build_object('city', null, 'items', '[]'::jsonb);
  end if;

  select city into v_city from public.profiles where id = v_uid;

  select coalesce(jsonb_agg(row_to_json(x)::jsonb order by x.created_at desc), '[]'::jsonb)
    into v_rows
  from (
    select
      m.id,
      m.kind,
      m.habit_title,
      m.streak_days,
      m.created_at,
      split_part(coalesce(sp.full_name, 'Someone'), ' ', 1) as sharer_name,
      split_part(coalesce(pp.full_name, ''), ' ', 1) as partner_name,
      sp.avatar_url as sharer_avatar,
      pp.avatar_url as partner_avatar,
      (select count(*) from public.milestone_reactions r where r.milestone_id = m.id) as reactions,
      exists (
        select 1 from public.milestone_reactions r
        where r.milestone_id = m.id and r.user_id = v_uid
      ) as i_reacted
    from public.milestones m
    left join public.profiles sp on sp.id = m.shared_by
    left join public.profiles pp on pp.id = m.partner_user_id
    where m.shared
      and m.city is not null
      and m.city = v_city
    union all
    -- A session both partners chose to share (D9: a pair post needs BOTH
    -- yeses). Only for clients that ask — older builds don't know this kind.
    select
      pl.id, 'session_together', case when pl.kind = 'first_run' then 'first run' else 'run' end,
      null::int, pl.completed_at,
      split_part(coalesce(pa.full_name, 'Someone'), ' ', 1),
      split_part(coalesce(pb.full_name, ''), ' ', 1),
      pa.avatar_url, pb.avatar_url,
      0::bigint, false
    from public.pair_plans pl
    join public.profiles pa on pa.id = pl.user_a
    join public.profiles pb on pb.id = pl.user_b
    where p_include_sessions
      and pl.status = 'completed'
      and pa.city is not null and pa.city = v_city
      and (select count(*) from public.session_shares s where s.plan_id = pl.id and s.shared) = 2
    order by 5 desc
    limit greatest(1, least(coalesce(p_limit, 30), 100))
  ) x;

  return jsonb_build_object('city', v_city, 'items', v_rows);
end;
$$;
grant execute on function public.get_city_feed(int, boolean) to authenticated;

create or replace function public.get_pair_plan(p_user_challenge_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  p public.pair_plans;
  v_other uuid;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;

  select * into p from public.pair_plans
  where p_user_challenge_id in (challenge_a, challenge_b)
    and v_uid in (user_a, user_b)
    and (status in ('planning', 'confirmed', 'verified')
         -- A just-finished session stays visible for its completion screen.
         or (status = 'completed' and completed_at > now() - interval '18 hours'))
  order by created_at desc
  limit 1;

  if p.id is null then return null; end if;
  v_other := case when p.user_a = v_uid then p.user_b else p.user_a end;

  return jsonb_build_object(
    'id', p.id,
    'kind', p.kind,
    'status', p.status,
    'activity_key', p.activity_key,
    'mode', p.mode,
    'distance', p.distance,
    'place_name', p.place_name,
    'place_text', p.place_text,
    'meeting_location_status', p.meeting_location_status,
    'founder_help_required', p.founder_help_required,
    'starts_at', p.starts_at,
    'qr_verified_at', p.qr_verified_at,
    'qr_mine', p.qr_issued_by = v_uid and p.qr_expires_at > now(),
    'i_open', p.opener_id = v_uid,
    'me', (select to_jsonb(m) - 'plan_id' - 'user_id' from public.pair_plan_members m
           where m.plan_id = p.id and m.user_id = v_uid),
    'them', (select (to_jsonb(m) - 'plan_id' - 'user_id') || jsonb_build_object(
               'first_name', split_part(coalesce(pr.full_name, 'Your partner'), ' ', 1),
               'avatar_url', pr.avatar_url)
             from public.pair_plan_members m join public.profiles pr on pr.id = m.user_id
             where m.plan_id = p.id and m.user_id = v_other),
    'messages', coalesce((select jsonb_agg(jsonb_build_object(
               'mine', pm.sender_id = v_uid, 'key', pm.template_key) order by pm.created_at)
             from public.pair_messages pm where pm.plan_id = p.id), '[]'::jsonb),
    -- The live suggestion per field, and how many rounds each has taken —
    -- "Need help choosing?" appears after two rounds without agreement.
    'open_proposals', coalesce((select jsonb_agg(jsonb_build_object(
               'id', pp.id, 'field', pp.field, 'value', pp.value,
               'mine', pp.proposed_by = v_uid, 'round', pp.round))
             from public.pair_proposals pp where pp.plan_id = p.id and pp.status = 'open'), '[]'::jsonb),
    'reactions', coalesce((select jsonb_agg(jsonb_build_object('mine', r.from_user = v_uid, 'reaction', r.reaction))
             from public.plan_reactions r where r.plan_id = p.id), '[]'::jsonb),
    'my_share', (select shared from public.session_shares s where s.plan_id = p.id and s.user_id = v_uid),
    'rounds', coalesce((select jsonb_object_agg(field, n) from (
               select field, count(*) as n from public.pair_proposals
               where plan_id = p.id group by field) r), '{}'::jsonb)
  );
end;
$$;

notify pgrst, 'reload schema';
