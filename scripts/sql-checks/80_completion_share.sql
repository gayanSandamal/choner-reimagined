-- P7 (202609231900): reactions only after both, pair post only with both yeses,
-- old clients never see the new feed kind.
\set ON_ERROR_STOP 1
\pset tuples_only on
\pset format unaligned
delete from auth.users where email like '%@p7.io';
insert into auth.users (id, email, instance_id, aud, role) values
 ('77777777-0000-0000-0000-00000000000a','a@p7.io','00000000-0000-0000-0000-000000000000','authenticated','authenticated'),
 ('77777777-0000-0000-0000-00000000000b','b@p7.io','00000000-0000-0000-0000-000000000000','authenticated','authenticated'),
 ('77777777-0000-0000-0000-00000000000c','c@p7.io','00000000-0000-0000-0000-000000000000','authenticated','authenticated');
update public.profiles set full_name = upper(right(id::text,1)) || ' Test', city = 'Colombo' where id::text like '77777777%';
insert into public.pair_plans (id, user_a, user_b, kind, status, completed_at, mode)
values ('77777777-9999-0000-0000-000000000001','77777777-0000-0000-0000-00000000000a','77777777-0000-0000-0000-00000000000b','first_run','completed', now(), 'together');
insert into public.pair_plan_members (plan_id, user_id) values
 ('77777777-9999-0000-0000-000000000001','77777777-0000-0000-0000-00000000000a'),('77777777-9999-0000-0000-000000000001','77777777-0000-0000-0000-00000000000b');
create or replace function pg_temp.as_(uid text) returns void language plpgsql as $$ begin perform set_config('request.jwt.claim.sub', uid, true); end $$;
\set P '''77777777-9999-0000-0000-000000000001'''
begin; set local role authenticated;
select pg_temp.as_('77777777-0000-0000-0000-00000000000a');
select 'a react (want ok): '::text || public.toggle_plan_reaction(:P, 'Proud of you');
select 'b bad reaction (want bad_reaction): '::text || public.toggle_plan_reaction(:P, 'lol');
select 'c A shares: '::text || public.record_session_share(:P, true);
select pg_temp.as_('77777777-0000-0000-0000-00000000000c');
select 'd one yes -> not in feed (want 0): '::text || jsonb_array_length(public.get_city_feed(30, true)->'items');
select pg_temp.as_('77777777-0000-0000-0000-00000000000b');
select 'e B shares: '::text || public.record_session_share(:P, true);
select pg_temp.as_('77777777-0000-0000-0000-00000000000c');
select 'f both yes -> one pair post (want 1 session_together first run A B): '::text
  || jsonb_array_length(public.get_city_feed(30, true)->'items') || ' '
  || (public.get_city_feed(30, true)->'items'->0->>'kind') || ' ' || (public.get_city_feed(30, true)->'items'->0->>'habit_title') || ' '
  || (public.get_city_feed(30, true)->'items'->0->>'sharer_name') || ' ' || (public.get_city_feed(30, true)->'items'->0->>'partner_name');
select 'g old clients (one arg) never see it (want 0): '::text || jsonb_array_length(public.get_city_feed(30)->'items');
select pg_temp.as_('77777777-0000-0000-0000-00000000000a');
commit;
