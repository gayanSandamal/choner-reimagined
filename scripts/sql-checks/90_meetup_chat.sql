-- P8 (202609232000): opens at the meetup, filters contact details, closes
-- at the QR scan / agreed reschedule, logs everything.
\set ON_ERROR_STOP 1
\pset tuples_only on
\pset format unaligned
select 'f1 filter (want phone_number phone_number link email handle null null): '::text
  || coalesce(public.meetup_message_problem('call me +94 77 123 4567'),'null') || ' '
  || coalesce(public.meetup_message_problem('0771234567'),'null') || ' '
  || coalesce(public.meetup_message_problem('see insta.com/me'),'null') || ' '
  || coalesce(public.meetup_message_problem('mail me a@b.lk'),'null') || ' '
  || coalesce(public.meetup_message_problem('I am @gayan_runs'),'null') || ' '
  || coalesce(public.meetup_message_problem('Red cap by the fountain, gate 2'),'null') || ' '
  || coalesce(public.meetup_message_problem('Running 5 km at 6:30'),'null');
delete from auth.users where email like '%@p8.io';
insert into auth.users (id, email, instance_id, aud, role) values
 ('88888888-0000-0000-0000-00000000000a','a@p8.io','00000000-0000-0000-0000-000000000000','authenticated','authenticated'),
 ('88888888-0000-0000-0000-00000000000b','b@p8.io','00000000-0000-0000-0000-000000000000','authenticated','authenticated');
update public.profiles set full_name = upper(right(id::text,1)) || ' Test', timezone = 'UTC' where id::text like '88888888%';
insert into public.pair_plans (id, user_a, user_b, kind, status, mode, distance, starts_at, meeting_location_status)
values ('88888888-9999-0000-0000-000000000001','88888888-0000-0000-0000-00000000000a','88888888-0000-0000-0000-00000000000b','first_run','confirmed','together','5 km', now(), 'agreed'),
       ('88888888-9999-0000-0000-000000000002','88888888-0000-0000-0000-00000000000a','88888888-0000-0000-0000-00000000000b','meetup','confirmed','together','3 km', now(), 'agreed');
insert into public.pair_plan_members (plan_id, user_id)
select p, u from (values ('88888888-9999-0000-0000-000000000001'::uuid),('88888888-9999-0000-0000-000000000002'::uuid)) a(p),
              (values ('88888888-0000-0000-0000-00000000000a'::uuid),('88888888-0000-0000-0000-00000000000b'::uuid)) b(u);
create or replace function pg_temp.as_(uid text) returns void language plpgsql as $$ begin perform set_config('request.jwt.claim.sub', uid, true); end $$;
\set P '''88888888-9999-0000-0000-000000000001'''
\set R '''88888888-9999-0000-0000-000000000002'''
begin; set local role authenticated;
select pg_temp.as_('88888888-0000-0000-0000-00000000000a');
select 'a no chat before arrival (want exists false): '::text || public.get_meetup_chat(:P);
select 'b send before open (want closed): '::text || public.send_meetup_message(:P, 'hi');
select 'c A here (one person): '::text || public.set_arrival(:P, 'here');
select 'd still no chat on one arrival (want exists false): '::text || public.get_meetup_chat(:P);
select pg_temp.as_('88888888-0000-0000-0000-00000000000b');
select 'e B here: '::text || public.set_arrival(:P, 'here');
select 'f chat open for both (want true false): '::text || (public.get_meetup_chat(:P)->>'open') || ' ' || (public.get_meetup_chat(:P)->>'reschedule');
select 'g B: red cap (want ok): '::text || public.send_meetup_message(:P, 'I''m in the red cap by the fountain');
select 'h B: phone refused (want phone_number): '::text || public.send_meetup_message(:P, 'text me on 077 123 4567');
select pg_temp.as_('88888888-0000-0000-0000-00000000000a');
select 'i A sees 1 message, not mine, no phone (want 1 false): '::text || jsonb_array_length(public.get_meetup_chat(:P)->'messages') || ' ' || (public.get_meetup_chat(:P)->'messages'->0->>'mine');
commit;
select 'j refused text still logged (want 2 1): '::text || count(*) || ' ' || count(*) filter (where blocked_reason is not null) from public.meetup_messages;
update public.pair_plans set qr_nonce = 'n1', qr_issued_by = '88888888-0000-0000-0000-00000000000b', qr_expires_at = now() + interval '2 minutes' where id = :P;
begin; set local role authenticated;
select pg_temp.as_('88888888-0000-0000-0000-00000000000a');
select 'k A scans: '::text || public.verify_session_qr('choner:plan:88888888-9999-0000-0000-000000000001:n1');
select 'l chat closed at QR (want false closed): '::text || (public.get_meetup_chat(:P)->>'open') || ' ' || (public.send_meetup_message(:P, 'hello?')->>'reason');
-- Reschedule path
select 'm A cant make it (opens with reschedule panel): '::text || public.relay_response(:R, 'cant_make_it');
select 'n reschedule chat (want true true): '::text || (public.get_meetup_chat(:R)->>'open') || ' ' || (public.get_meetup_chat(:R)->>'reschedule');
select 'o A proposes tomorrow: '::text || public.propose_reschedule(:R, now() + interval '1 day');
select 'p chat still open after one side proposes (want true): '::text || (public.get_meetup_chat(:R)->>'open');
commit;
create temp table r8 as select id from public.pair_proposals where plan_id = :R and field = 'reschedule' and status = 'open'; grant select on r8 to authenticated;
begin; set local role authenticated;
select pg_temp.as_('88888888-0000-0000-0000-00000000000b');
select 'q B accepts: '::text || public.accept_reschedule((select id from r8));
select 'r closed once both agreed (want false): '::text || (public.get_meetup_chat(:R)->>'open');
commit;
