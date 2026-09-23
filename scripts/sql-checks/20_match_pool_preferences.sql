-- P0 (202609231100): the matcher receives saved preferences, and a search is
-- stamped only on the request that was searched.
\set ON_ERROR_STOP 1
\pset tuples_only on
\pset format unaligned
delete from auth.users where email like '%@p0.io';
insert into auth.users (id, email, instance_id, aud, role) values
 ('11111111-0000-0000-0000-000000000001','e@p0.io','00000000-0000-0000-0000-000000000000','authenticated','authenticated');
create temp table t2 as select id as run, (select id from public.challenge_templates where is_active order by sort_order, id offset 1 limit 1) as gym
  from public.challenge_templates where is_active order by sort_order, id limit 1;
insert into public.user_challenges (id, user_id, challenge_template_id, accountability_mode, status, partner_state, gender_preference, pace, specific_days)
values ('11111111-1111-0000-0000-000000000001','11111111-0000-0000-0000-000000000001',(select run from t2),'partner','active','finding','same_gender_only','fast', array['mon','wed']),
       ('11111111-1111-0000-0000-000000000002','11111111-0000-0000-0000-000000000001',(select gym from t2),'partner','active','finding',null,null,null);
insert into public.partner_match_requests (user_id, user_challenge_id, challenge_template_id, status)
select user_id, id, challenge_template_id, 'waiting' from public.user_challenges where user_id = '11111111-0000-0000-0000-000000000001';

select 'sameGenderOnly (want true): '::text || (e->>'sameGenderOnly') || ' | pace (want fast): ' || (e->>'pace') || ' | specificDays (want 2): ' || jsonb_array_length(e->'specificDays')
from jsonb_array_elements(public.get_match_pool()) e
where e->>'userId' = '11111111-0000-0000-0000-000000000001' and e->>'challengeTemplateId' = (select run::text from t2);
select 'unset preference is null, not false (want null): '::text || coalesce(e->>'sameGenderOnly','null')
from jsonb_array_elements(public.get_match_pool()) e
where e->>'userId' = '11111111-0000-0000-0000-000000000001' and e->>'challengeTemplateId' = (select gym::text from t2);

select public.record_match_search('11111111-0000-0000-0000-000000000001', false, (select run from t2));
select 'no_match only on the searched request (want run=set gym=null): '::text ||
  string_agg(case when challenge_template_id = (select run from t2) then 'run' else 'gym' end || '=' || case when no_match_at is null then 'null' else 'set' end, ' ' order by challenge_template_id = (select gym from t2))
from public.partner_match_requests where user_id = '11111111-0000-0000-0000-000000000001';
