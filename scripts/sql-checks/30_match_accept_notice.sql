-- §7.1 (202609231400): one side accepting notifies the other, and only them.
\set ON_ERROR_STOP 1
\pset tuples_only on
\pset format unaligned
delete from auth.users where email like '%@p2.io';
insert into auth.users (id, email, instance_id, aud, role) values
 ('22222222-0000-0000-0000-00000000000a','ga@p2.io','00000000-0000-0000-0000-000000000000','authenticated','authenticated'),
 ('22222222-0000-0000-0000-00000000000b','gb@p2.io','00000000-0000-0000-0000-000000000000','authenticated','authenticated');
update public.profiles set full_name = 'Gayan Test', timezone = 'UTC' where id = '22222222-0000-0000-0000-00000000000a';
create temp table t3 as select id as tpl from public.challenge_templates where is_active order by sort_order, id limit 1;
insert into public.user_challenges (id, user_id, challenge_template_id, accountability_mode, status, partner_state)
select x.id::uuid, x.uid::uuid, (select tpl from t3), 'partner', 'active', 'finding'
from (values ('22222222-1111-0000-0000-00000000000a','22222222-0000-0000-0000-00000000000a'),
             ('22222222-1111-0000-0000-00000000000b','22222222-0000-0000-0000-00000000000b')) x(id, uid);
insert into public.partner_match_requests (user_id, user_challenge_id, challenge_template_id, status)
select user_id, id, challenge_template_id, 'waiting' from public.user_challenges where user_id::text like '22222222%';
select 'setup: '::text || public.create_partner_match('22222222-0000-0000-0000-00000000000a','22222222-0000-0000-0000-00000000000b',(select tpl from t3),'x','y');
create temp table m3 as select id from public.partner_matches where user_a = '22222222-0000-0000-0000-00000000000a';
grant select on m3 to authenticated;
begin; set local role authenticated;
select set_config('request.jwt.claim.sub','22222222-0000-0000-0000-00000000000a',true);
select 'A accepts (want both false): '::text || public.confirm_match((select id from m3));
commit;
select 'B told (want 1 partner_accepted, "Gayan said yes", route find): '::text || count(*) || ' ' || max(title) || ' ' || max(data->>'route')
from public.notifications where user_id = '22222222-0000-0000-0000-00000000000b' and kind = 'partner_accepted';
select 'A not told (want 0): '::text || count(*) from public.notifications where user_id = '22222222-0000-0000-0000-00000000000a' and kind = 'partner_accepted';
