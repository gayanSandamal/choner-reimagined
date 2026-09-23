-- P5 (202609231700): per-user distance, negotiation, rounds, help, confirm.
\set ON_ERROR_STOP 1
\pset tuples_only on
\pset format unaligned
delete from auth.users where email like '%@p5.io';
insert into auth.users (id, email, instance_id, aud, role) values
 ('55555555-0000-0000-0000-00000000000a','a@p5.io','00000000-0000-0000-0000-000000000000','authenticated','authenticated'),
 ('55555555-0000-0000-0000-00000000000b','b@p5.io','00000000-0000-0000-0000-000000000000','authenticated','authenticated');
update public.profiles set full_name = upper(right(id::text,1)) || ' Test', timezone = 'UTC' where id::text like '55555555%';
insert into public.pair_plans (id, user_a, user_b, kind, opener_id, mode)
values ('55555555-9999-0000-0000-000000000001','55555555-0000-0000-0000-00000000000a','55555555-0000-0000-0000-00000000000b','first_run','55555555-0000-0000-0000-00000000000a', null);
insert into public.pair_plan_members (plan_id, user_id) values
 ('55555555-9999-0000-0000-000000000001','55555555-0000-0000-0000-00000000000a'),
 ('55555555-9999-0000-0000-000000000001','55555555-0000-0000-0000-00000000000b');
create or replace function pg_temp.as_(uid text) returns void language plpgsql as $$ begin perform set_config('request.jwt.claim.sub', uid, true); end $$;
\set P '''55555555-9999-0000-0000-000000000001'''
begin; set local role authenticated;
select pg_temp.as_('55555555-0000-0000-0000-00000000000a');
select 'a bad distance refused (want bad_value): '::text || public.set_distance_answer(:P, '42 km');
select 'b A answers 5 km (want agreed false conflict false): '::text || public.set_distance_answer(:P, '5 km');
select pg_temp.as_('55555555-0000-0000-0000-00000000000b');
select 'c B answers 3 km (want conflict true): '::text || public.set_distance_answer(:P, '3 km');
commit;
select 'd answers stayed per person (want 5 km|3 km): '::text || string_agg(distance_answer, '|' order by user_id) from public.pair_plan_members where plan_id = :P;
begin; set local role authenticated;
select pg_temp.as_('55555555-0000-0000-0000-00000000000b');
select 'e B suggests 5 km (want round 1): '::text || public.propose_plan_value(:P, 'distance', '"5 km"');
commit;
create temp table pr as select id from public.pair_proposals where plan_id = :P and status = 'open'; grant select on pr to authenticated;
begin; set local role authenticated;
select pg_temp.as_('55555555-0000-0000-0000-00000000000b');
select 'f B cannot accept own (want own_proposal): '::text || public.accept_plan_proposal((select id from pr));
select pg_temp.as_('55555555-0000-0000-0000-00000000000a');
select 'g A: Sounds good (want ok): '::text || public.accept_plan_proposal((select id from pr));
commit;
select 'h agreed distance (want 5 km): '::text || distance from public.pair_plans where id = :P;
begin; set local role authenticated;
select pg_temp.as_('55555555-0000-0000-0000-00000000000a');
select 'i A suggests together: '::text || public.propose_plan_value(:P, 'mode', '"together"');
select pg_temp.as_('55555555-0000-0000-0000-00000000000b');
select 'j B counters separate (want round 2): '::text || public.propose_plan_value(:P, 'mode', '"separate"');
select pg_temp.as_('55555555-0000-0000-0000-00000000000a');
select 'k A counters together (want round 3): '::text || public.propose_plan_value(:P, 'mode', '"together"');
commit;
select 'l one open mode proposal, 2 superseded (want 1 2): '::text || count(*) filter (where status='open') || ' ' || count(*) filter (where status='superseded') from public.pair_proposals where plan_id = :P and field = 'mode';
create temp table pm as select id from public.pair_proposals where plan_id = :P and field = 'mode' and status = 'open'; grant select on pm to authenticated;
begin; set local role authenticated;
select pg_temp.as_('55555555-0000-0000-0000-00000000000b');
select 'm B accepts together: '::text || public.accept_plan_proposal((select id from pm));
select 'n confirm before place/time (want not_agreed): '::text || public.confirm_plan(:P);
select 'o B suggests a place: '::text || public.propose_plan_value(:P, 'place', '{"name":"Diyasaru Park","text":"Main gate"}');
commit;
select 'p location proposed by B (want proposed true): '::text || meeting_location_status || ' ' || (location_suggested_by::text like '%b')::text from public.pair_plans where id = :P;
begin; set local role authenticated;
select pg_temp.as_('55555555-0000-0000-0000-00000000000a');
select 'q A: need help (want ok): '::text || public.request_plan_help(:P, 'place');
commit;
select 'r needs_help flagged (want needs_help true): '::text || meeting_location_status || ' ' || founder_help_required from public.pair_plans where id = :P;
create temp table pp as select id from public.pair_proposals where plan_id = :P and field = 'place' and status = 'open'; grant select on pp to authenticated;
begin; set local role authenticated;
select pg_temp.as_('55555555-0000-0000-0000-00000000000a');
select 's A accepts place after help: '::text || public.accept_plan_proposal((select id from pp));
select 't A suggests a time: '::text || public.propose_plan_value(:P, 'time', '{"starts_at":"2026-09-26T06:30:00Z"}');
commit;
create temp table pt as select id from public.pair_proposals where plan_id = :P and field = 'time' and status = 'open'; grant select on pt to authenticated;
begin; set local role authenticated;
select pg_temp.as_('55555555-0000-0000-0000-00000000000b');
select 'u B accepts time: '::text || public.accept_plan_proposal((select id from pt));
select 'v B confirms (want both false): '::text || public.confirm_plan(:P);
select pg_temp.as_('55555555-0000-0000-0000-00000000000a');
select 'w A confirms (want both true): '::text || public.confirm_plan(:P);
commit;
select 'x plan (want confirmed founder_assisted Diyasaru Park): '::text || status || ' ' || meeting_location_status || ' ' || place_name from public.pair_plans where id = :P;
select 'y B (first to confirm) told (want 1 plan_confirmed "A is in too."): '::text || count(*) || ' ' || max(body) from public.notifications where user_id = '55555555-0000-0000-0000-00000000000b' and kind = 'plan_confirmed';
