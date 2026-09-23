-- P6 (202609231800): arrival per person, relay, QR only when both here, the
-- scan is the check-in for both, finish, 6B check-in, reschedule.
\set ON_ERROR_STOP 1
\pset tuples_only on
\pset format unaligned
delete from auth.users where email like '%@p6.io';
insert into auth.users (id, email, instance_id, aud, role) values
 ('66666666-0000-0000-0000-00000000000a','a@p6.io','00000000-0000-0000-0000-000000000000','authenticated','authenticated'),
 ('66666666-0000-0000-0000-00000000000b','b@p6.io','00000000-0000-0000-0000-000000000000','authenticated','authenticated');
update public.profiles set full_name = upper(right(id::text,1)) || ' Test', timezone = 'UTC' where id::text like '66666666%';
create temp table t6 as select id as tpl from public.challenge_templates where is_active order by sort_order, id limit 1;
insert into public.user_challenges (id, user_id, challenge_template_id, accountability_mode, status, partner_state, mode, started_at) values
 ('66666666-1111-0000-0000-00000000000a','66666666-0000-0000-0000-00000000000a',(select tpl from t6),'partner','active','partnered','together', now() - interval '1 day'),
 ('66666666-1111-0000-0000-00000000000b','66666666-0000-0000-0000-00000000000b',(select tpl from t6),'partner','active','partnered','together', now() - interval '1 day');
insert into public.challenge_tasks (user_challenge_id, title) values ('66666666-1111-0000-0000-00000000000a','Run'), ('66666666-1111-0000-0000-00000000000b','Run');
insert into public.pair_plans (id, user_a, user_b, challenge_a, challenge_b, kind, opener_id, mode, distance, starts_at, status, meeting_location_status)
values ('66666666-9999-0000-0000-000000000001','66666666-0000-0000-0000-00000000000a','66666666-0000-0000-0000-00000000000b',
        '66666666-1111-0000-0000-00000000000a','66666666-1111-0000-0000-00000000000b','first_run','66666666-0000-0000-0000-00000000000a','together','5 km', now(), 'confirmed','agreed'),
       ('66666666-9999-0000-0000-000000000002','66666666-0000-0000-0000-00000000000a','66666666-0000-0000-0000-00000000000b',
        null, null,'meetup','66666666-0000-0000-0000-00000000000a','separate','3 km', now(), 'confirmed','not_set');
insert into public.pair_plan_members (plan_id, user_id)
select p, u from (values ('66666666-9999-0000-0000-000000000001'::uuid),('66666666-9999-0000-0000-000000000002'::uuid)) a(p),
              (values ('66666666-0000-0000-0000-00000000000a'::uuid),('66666666-0000-0000-0000-00000000000b'::uuid)) b(u);
create or replace function pg_temp.as_(uid text) returns void language plpgsql as $$ begin perform set_config('request.jwt.claim.sub', uid, true); end $$;
\set T '''66666666-9999-0000-0000-000000000001'''
\set S '''66666666-9999-0000-0000-000000000002'''
begin; set local role authenticated;
select pg_temp.as_('66666666-0000-0000-0000-00000000000a');
select 'a A on my way: '::text || public.set_arrival(:T, 'on_my_way');
select 'b QR before both here (want not_both_here): '::text || public.issue_session_qr(:T);
select 'c A here: '::text || public.set_arrival(:T, 'here');
commit;
select 'd per-person flags (want A here, B not): '::text || string_agg(right(user_id::text,1) || '=' || (here_at is not null)::text, ' ' order by user_id) from public.pair_plan_members where plan_id = :T;
select 'e B got the relay with 3-option category (want plan_arrived plan_relay): '::text || count(*) || ' ' || max(kind) from public.notifications where user_id = '66666666-0000-0000-0000-00000000000b' and kind = 'plan_arrived';
begin; set local role authenticated;
select pg_temp.as_('66666666-0000-0000-0000-00000000000b');
select 'f B: I''m here too: '::text || public.relay_response(:T, 'here_too');
select 'g B issues QR: '::text || ((public.issue_session_qr(:T))->>'ok');
commit;
create temp table q as select 'choner:plan:' || id || ':' || qr_nonce as payload from public.pair_plans where id = :T; grant select on q to authenticated;
begin; set local role authenticated;
select pg_temp.as_('66666666-0000-0000-0000-00000000000b');
select 'h issuer cannot scan own (want own_code): '::text || public.verify_session_qr((select payload from q));
select pg_temp.as_('66666666-0000-0000-0000-00000000000a');
select 'i garbage code (want not_a_choner_code): '::text || public.verify_session_qr('https://evil.example');
select 'j A scans B (want ok): '::text || public.verify_session_qr((select payload from q));
select 'k replay (want no_plan): '::text || public.verify_session_qr((select payload from q));
commit;
select 'l verified + both checked in (want verified 2): '::text || (select status from public.pair_plans where id = :T) || ' ' || (select count(*) from public.task_checkins where user_challenge_id::text like '66666666-1111%');
select 'm scan counts as met (want true): '::text || public.pairing_has_met('66666666-1111-0000-0000-00000000000a','66666666-1111-0000-0000-00000000000b');
begin; set local role authenticated;
select pg_temp.as_('66666666-0000-0000-0000-00000000000a');
select 'n A finish (want both false): '::text || public.finish_session(:T);
select pg_temp.as_('66666666-0000-0000-0000-00000000000b');
select 'o B finish (want both true): '::text || public.finish_session(:T);
commit;
select 'p completed (want completed): '::text || status from public.pair_plans where id = :T;
begin; set local role authenticated;
select pg_temp.as_('66666666-0000-0000-0000-00000000000a');
select 'q cant without reason (want bad_reason): '::text || public.set_session_checkin(:S, 'cant', null);
select 'r A later: '::text || public.set_session_checkin(:S, 'later');
commit;
select 's B told in handover words (want "A hasn''t run yet. They will do it later today."): '::text || max(title) from public.notifications where user_id = '66666666-0000-0000-0000-00000000000b' and kind = 'plan_update';
begin; set local role authenticated;
select pg_temp.as_('66666666-0000-0000-0000-00000000000b');
select 't B cant, Weather: '::text || public.set_session_checkin(:S, 'cant', 'Weather');
select 'u B proposes tomorrow: '::text || public.propose_reschedule(:S, now() + interval '1 day');
commit;
create temp table rr as select id from public.pair_proposals where plan_id = :S and field = 'reschedule' and status = 'open'; grant select on rr to authenticated;
begin; set local role authenticated;
select pg_temp.as_('66666666-0000-0000-0000-00000000000a');
select 'v A sends encouragement: '::text || public.send_encouragement(:S);
select 'w A accepts change: '::text || public.accept_reschedule((select id from rr));
commit;
select 'x checkins reset for the new day (want 0): '::text || count(*) filter (where checkin is not null) from public.pair_plan_members where plan_id = :S;
begin; set local role authenticated;
select pg_temp.as_('66666666-0000-0000-0000-00000000000a');
select 'y A done: '::text || (public.set_session_checkin(:S, 'done')->>'ok');
select pg_temp.as_('66666666-0000-0000-0000-00000000000b');
select 'z B done -> completed: '::text || (public.set_session_checkin(:S, 'done')->>'ok') || ' ' || (select status from public.pair_plans limit 0);
commit;
select 'zz 6B plan (want completed): '::text || status from public.pair_plans where id = :S;
