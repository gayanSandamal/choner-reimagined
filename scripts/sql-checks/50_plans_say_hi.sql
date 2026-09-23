-- P4 (202609231600): plan on confirm (R/W/C only), Say Hi rules, me/them view,
-- Block ends plans.
\set ON_ERROR_STOP 1
\pset tuples_only on
\pset format unaligned
delete from auth.users where email like '%@p4.io';
insert into auth.users (id, email, instance_id, aud, role) values
 ('44444444-0000-0000-0000-00000000000a','a@p4.io','00000000-0000-0000-0000-000000000000','authenticated','authenticated'),
 ('44444444-0000-0000-0000-00000000000b','b@p4.io','00000000-0000-0000-0000-000000000000','authenticated','authenticated'),
 ('44444444-0000-0000-0000-00000000000c','c@p4.io','00000000-0000-0000-0000-000000000000','authenticated','authenticated'),
 ('44444444-0000-0000-0000-00000000000d','d@p4.io','00000000-0000-0000-0000-000000000000','authenticated','authenticated');
update public.profiles set full_name = upper(right(id::text,1)) || ' Test' where id::text like '44444444%';
update public.challenge_templates set activity_key = 'running' where id = (select id from public.challenge_templates where is_active order by sort_order, id limit 1);
create temp table t4 as select
  (select id from public.challenge_templates where is_active order by sort_order, id limit 1) as run,
  (select id from public.challenge_templates where is_active and coalesce(activity_key,'') not in ('running','walking','cycling') order by sort_order, id limit 1) as other;
insert into public.user_challenges (id, user_id, challenge_template_id, accountability_mode, status, partner_state, mode) values
 ('44444444-1111-0000-0000-00000000000a','44444444-0000-0000-0000-00000000000a',(select run from t4),'partner','active','finding','either'),
 ('44444444-1111-0000-0000-00000000000b','44444444-0000-0000-0000-00000000000b',(select run from t4),'partner','active','finding','together'),
 ('44444444-1111-0000-0000-00000000000c','44444444-0000-0000-0000-00000000000c',(select other from t4),'partner','active','finding','separate'),
 ('44444444-1111-0000-0000-00000000000d','44444444-0000-0000-0000-00000000000d',(select other from t4),'partner','active','finding','separate');
insert into public.partner_match_requests (user_id, user_challenge_id, challenge_template_id, status)
select user_id, id, challenge_template_id, 'waiting' from public.user_challenges where user_id::text like '44444444%';
select public.create_partner_match('44444444-0000-0000-0000-00000000000a','44444444-0000-0000-0000-00000000000b',(select run from t4),'x','y','44444444-0000-0000-0000-00000000000b');
select public.create_partner_match('44444444-0000-0000-0000-00000000000c','44444444-0000-0000-0000-00000000000d',(select other from t4),'x','y');
create temp table m4 as select id, user_a from public.partner_matches where user_a::text like '44444444%';
grant select on m4 to authenticated;
create or replace function pg_temp.as_(uid text) returns void language plpgsql as $$ begin perform set_config('request.jwt.claim.sub', uid, true); end $$;
begin; set local role authenticated;
select pg_temp.as_('44444444-0000-0000-0000-00000000000a'); select public.confirm_match((select id from m4 where user_a::text like '%a'));
select pg_temp.as_('44444444-0000-0000-0000-00000000000b'); select public.confirm_match((select id from m4 where user_a::text like '%a'));
select pg_temp.as_('44444444-0000-0000-0000-00000000000c'); select public.confirm_match((select id from m4 where user_a::text like '%c'));
select pg_temp.as_('44444444-0000-0000-0000-00000000000d'); select public.confirm_match((select id from m4 where user_a::text like '%c'));
commit;
select 'a plans: running pair 1, other pair 0 (want 1 0): '::text
  || (select count(*) from public.pair_plans where user_a::text like '%0000000a') || ' '
  || (select count(*) from public.pair_plans where user_a::text like '%0000000c');
select 'b mode Either+Together -> together; opener is requester B (want together true): '::text || mode || ' ' || (opener_id::text like '%b')::text from public.pair_plans where user_a::text like '%a';
create temp table p4 as select id from public.pair_plans where user_a::text like '%a'; grant select on p4 to authenticated;
begin; set local role authenticated;
select pg_temp.as_('44444444-0000-0000-0000-00000000000a');
select 'c A opening refused (want not_opener): '::text || public.send_pair_message((select id from p4), 'opener');
select 'd A reply before opener (want too_early): '::text || public.send_pair_message((select id from p4), 'lets_go');
select pg_temp.as_('44444444-0000-0000-0000-00000000000b');
select 'e B opens (want ok): '::text || public.send_pair_message((select id from p4), 'opener');
select 'f B twice (want already_sent): '::text || public.send_pair_message((select id from p4), 'opener');
select pg_temp.as_('44444444-0000-0000-0000-00000000000a');
select 'g A replies (want ok): '::text || public.send_pair_message((select id from p4), 'cant_wait');
select 'h A view: opener not mine, reply mine, them=B (want false,true B false): '::text
  || (public.get_pair_plan('44444444-1111-0000-0000-00000000000a')->'messages'->0->>'mine') || ','
  || (public.get_pair_plan('44444444-1111-0000-0000-00000000000a')->'messages'->1->>'mine') || ' '
  || (public.get_pair_plan('44444444-1111-0000-0000-00000000000a')->'them'->>'first_name') || ' '
  || (public.get_pair_plan('44444444-1111-0000-0000-00000000000a')->>'i_open');
select pg_temp.as_('44444444-0000-0000-0000-00000000000b');
select 'i B view mirrored (want true,false A true): '::text
  || (public.get_pair_plan('44444444-1111-0000-0000-00000000000b')->'messages'->0->>'mine') || ','
  || (public.get_pair_plan('44444444-1111-0000-0000-00000000000b')->'messages'->1->>'mine') || ' '
  || (public.get_pair_plan('44444444-1111-0000-0000-00000000000b')->'them'->>'first_name') || ' '
  || (public.get_pair_plan('44444444-1111-0000-0000-00000000000b')->>'i_open');
select 'j no user ids leak (want false): '::text || (public.get_pair_plan('44444444-1111-0000-0000-00000000000b')::text like '%44444444-0000%');
select 'k block ends the plan: '::text || public.block_partner('44444444-1111-0000-0000-00000000000b');
commit;
select 'l plan status (want ended): '::text || status from public.pair_plans where id = (select id from p4);
