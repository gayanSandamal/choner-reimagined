-- Choner Pulse: what Home says about everyone else, in real numbers.
--
-- The prototype's card read "42 people are showing up today". There was no 42.
-- A fabricated number is the kind of thing nobody remembers is fabricated, so
-- the card is fed from the database or it says nothing.
--
-- Counts only. No names, no ids, nothing about any one person. "Today" is the
-- last 24 hours rather than a calendar day, because the people reading it are
-- in different timezones and a UTC midnight is nobody's midnight.

create or replace function public.get_home_pulse()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  return jsonb_build_object(
    -- People with something live.
    'people', (select count(distinct uc.user_id) from public.user_challenges uc
               where uc.status = 'active'),
    'by_activity', coalesce((
      select jsonb_agg(jsonb_build_object('activity_key', x.activity_key, 'title', x.title, 'people', x.n)
                       order by x.sort_order)
      from (
        select t.activity_key, t.title, t.sort_order, count(distinct uc.user_id) as n
        from public.challenge_templates t
        left join public.user_challenges uc
          on uc.challenge_template_id = t.id and uc.status = 'active'
        where t.is_active and t.activity_key is not null
        group by t.activity_key, t.title, t.sort_order
      ) x), '[]'::jsonb),
    'pairs', (select count(*) from public.partnerships where state = 'active'),
    'new_pairs_today', (select count(*) from public.partnerships
                        where started_at > now() - interval '24 hours'),
    'sessions_today', (select count(*) from public.pair_plans
                       where status = 'completed' and completed_at > now() - interval '24 hours'),
    'sessions_planned', (select count(*) from public.pair_plans
                         where status in ('confirmed', 'verified') and starts_at > now())
  );
end;
$$;

revoke all on function public.get_home_pulse() from public, anon;
grant execute on function public.get_home_pulse() to authenticated;
