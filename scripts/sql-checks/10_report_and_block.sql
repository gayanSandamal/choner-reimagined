-- Report & Block (202609231000). Run via scripts/check-migrations.sh.
-- Every line prints a label and a value; the runner diffs nothing, so read the
-- output — each label says what the value must be.
\set ON_ERROR_STOP 1
\pset tuples_only on
\pset format unaligned
-- ---------- setup (as admin) ----------
delete from auth.users where email like '%@t.io'; insert into auth.users (id, email, instance_id, aud, role) values
 ('aaaaaaaa-0000-0000-0000-00000000000a','a@t.io','00000000-0000-0000-0000-000000000000','authenticated','authenticated'),
 ('bbbbbbbb-0000-0000-0000-00000000000b','b@t.io','00000000-0000-0000-0000-000000000000','authenticated','authenticated'),
 ('cccccccc-0000-0000-0000-00000000000c','c@t.io','00000000-0000-0000-0000-000000000000','authenticated','authenticated'),
 ('dddddddd-0000-0000-0000-00000000000d','d@t.io','00000000-0000-0000-0000-000000000000','authenticated','authenticated');
update public.profiles set full_name = upper(left(email,1)) || ' Test' from auth.users u where u.id = profiles.id;
create temp table t as select id as tpl from public.challenge_templates where is_active order by sort_order limit 1;
grant select on t to authenticated;
insert into public.user_challenges (id, user_id, challenge_template_id, accountability_mode, status, partner_state, started_at)
select x.id::uuid, x.uid::uuid, (select tpl from t), 'partner', 'active', 'finding', now() - interval '3 days'
from (values ('a1000000-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-00000000000a'),
             ('b1000000-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-00000000000b'),
             ('c1000000-0000-0000-0000-000000000001','cccccccc-0000-0000-0000-00000000000c'),
             ('d1000000-0000-0000-0000-000000000001','dddddddd-0000-0000-0000-00000000000d')) x(id, uid);
insert into public.partner_match_requests (user_id, user_challenge_id, challenge_template_id, status)
select user_id, id, challenge_template_id, 'waiting' from public.user_challenges;
select 'setup create A-B: '::text || public.create_partner_match('aaaaaaaa-0000-0000-0000-00000000000a','bbbbbbbb-0000-0000-0000-00000000000b',(select tpl from t),'x','y');
select 'setup create C-D: '::text || public.create_partner_match('cccccccc-0000-0000-0000-00000000000c','dddddddd-0000-0000-0000-00000000000d',(select tpl from t),'x','y');

create temp table ids as select
  (select id from public.partner_matches where user_a in ('aaaaaaaa-0000-0000-0000-00000000000a','bbbbbbbb-0000-0000-0000-00000000000b') limit 1) as ab,
  (select id from public.partner_matches where user_a in ('cccccccc-0000-0000-0000-00000000000c','dddddddd-0000-0000-0000-00000000000d') limit 1) as cd;
grant select on ids to authenticated;
-- helper to act as a user
create or replace function pg_temp.as_user(uid text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', uid, true);
end $$;

-- ---------- 1. report on a PENDING match ----------
begin;
set local role authenticated;
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-00000000000a');
select '1a post-meet category refused: '::text || public.report_match((select ab from ids), 'didnt_show_up', null);
select '1b fake_profile accepted: '::text || public.report_match((select ab from ids), 'fake_profile', '  photo looks stolen  ');
select '1c reporter cannot read reports: '::text || count(*) from public.user_reports;
select '1d reporter cannot read blocks: '::text || count(*) from public.user_blocks;
commit;
select '1e match status: '::text || status || ', ended_at set: ' || (ended_at is not null) from public.partner_matches where id = (select ab from ids);
select '1f requests back to waiting: '::text || string_agg(status, ',' order by user_id) from public.partner_match_requests where user_id in ('aaaaaaaa-0000-0000-0000-00000000000a','bbbbbbbb-0000-0000-0000-00000000000b');
select '1g partner_state: '::text || string_agg(partner_state, ',' order by user_id) from public.user_challenges where user_id in ('aaaaaaaa-0000-0000-0000-00000000000a','bbbbbbbb-0000-0000-0000-00000000000b');
select '1h report row: '::text || category || ' met=' || met || ' text=[' || free_text || '] status=' || status from public.user_reports;
select '1i B told nothing: '::text || count(*) from public.notifications where user_id = 'bbbbbbbb-0000-0000-0000-00000000000b';
select '1j pool: B excludes A: '::text || ((e->'previouslyUnmatchedWith') ? 'aaaaaaaa-0000-0000-0000-00000000000a')::text from jsonb_array_elements(public.get_match_pool()) e where e->>'userId' = 'bbbbbbbb-0000-0000-0000-00000000000b';
select '1k pool: A excludes B: '::text || ((e->'previouslyUnmatchedWith') ? 'bbbbbbbb-0000-0000-0000-00000000000b')::text from jsonb_array_elements(public.get_match_pool()) e where e->>'userId' = 'aaaaaaaa-0000-0000-0000-00000000000a';
select '1l re-match refused: '::text || public.create_partner_match('bbbbbbbb-0000-0000-0000-00000000000b','aaaaaaaa-0000-0000-0000-00000000000a',(select tpl from t),'x','y');

-- ---------- 2. CONFIRMED pair: met gating, then block ----------
begin; set local role authenticated; select pg_temp.as_user('cccccccc-0000-0000-0000-00000000000c');
select '2a C confirms: '::text || public.confirm_match((select cd from ids));
commit;
begin; set local role authenticated; select pg_temp.as_user('dddddddd-0000-0000-0000-00000000000d');
select '2b D confirms: '::text || public.confirm_match((select cd from ids));
commit;
begin; set local role authenticated; select pg_temp.as_user('cccccccc-0000-0000-0000-00000000000c');
select '2c met before any check-in: '::text || public.my_pairing_met('c1000000-0000-0000-0000-000000000001');
select '2d post-meet category refused pre-meet: '::text || public.report_partner('c1000000-0000-0000-0000-000000000001', 'safety_concern', null);
select '2e cannot act via someone elses challenge: '::text || public.block_partner('d1000000-0000-0000-0000-000000000001');
commit;
-- a solo check-in from BEFORE the pairing must not count as meeting
insert into public.challenge_tasks (id, user_challenge_id, title) values ('e1000000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-000000000001','Run');
insert into public.task_checkins (challenge_task_id, user_challenge_id, status, completed_at) values ('e1000000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-000000000001','completed', now() - interval '2 days');
begin; set local role authenticated; select pg_temp.as_user('cccccccc-0000-0000-0000-00000000000c');
select '2f pre-pairing check-in ignored: '::text || public.my_pairing_met('c1000000-0000-0000-0000-000000000001');
commit;
insert into public.task_checkins (challenge_task_id, user_challenge_id, status, completed_at) values ('e1000000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-000000000001','completed', now() + interval '1 second');
begin; set local role authenticated; select pg_temp.as_user('cccccccc-0000-0000-0000-00000000000c');
select '2g met after a paired check-in: '::text || public.my_pairing_met('c1000000-0000-0000-0000-000000000001');
select '2h is_partner_of before block: '::text || public.is_partner_of('cccccccc-0000-0000-0000-00000000000c','dddddddd-0000-0000-0000-00000000000d');
commit;
begin; set local role authenticated; select pg_temp.as_user('dddddddd-0000-0000-0000-00000000000d');
select '2i D blocks C: '::text || public.block_partner('d1000000-0000-0000-0000-000000000001');
commit;
select '2j states: '::text || string_agg(user_id::text || '=' || partner_state || '/' || coalesce(partner_user_id::text,'null') || '/' || status, ' ' order by user_id) from public.user_challenges where user_id in ('cccccccc-0000-0000-0000-00000000000c','dddddddd-0000-0000-0000-00000000000d');
select '2k match: '::text || status from public.partner_matches where id = (select cd from ids);
select '2l is_partner_of after block: '::text || public.is_partner_of('cccccccc-0000-0000-0000-00000000000c','dddddddd-0000-0000-0000-00000000000d');
select '2m C notified neutrally: '::text || kind || ' | ' || title || ' | ' || body from public.notifications where user_id = 'cccccccc-0000-0000-0000-00000000000c';
select '2n notice never names anyone: '::text || (count(*) filter (where title || body ilike '%block%' or title || body ilike '%D Test%') = 0) from public.notifications where user_id = 'cccccccc-0000-0000-0000-00000000000c';
select '2o D (blocker) got nothing: '::text || count(*) from public.notifications where user_id = 'dddddddd-0000-0000-0000-00000000000d';
select '2p block recorded: '::text || count(*) from public.user_blocks where blocker_id = 'dddddddd-0000-0000-0000-00000000000d' and blocked_id = 'cccccccc-0000-0000-0000-00000000000c';
begin; set local role authenticated; select pg_temp.as_user('cccccccc-0000-0000-0000-00000000000c');
-- 2q moved to section 4: since 202609231200 a late report is recorded, not refused.
commit;

-- ---------- 3. grants ----------
begin; set local role anon;
select '3a anon can block?';
savepoint s; 
do $$ begin perform public.block_partner('c1000000-0000-0000-0000-000000000001'); raise notice 'UNEXPECTED: anon allowed'; exception when insufficient_privilege then raise notice '3a anon refused: ok'; end $$;
rollback;
begin; set local role authenticated;
do $$ begin perform public.end_pairings_between('cccccccc-0000-0000-0000-00000000000c','dddddddd-0000-0000-0000-00000000000d'); raise notice 'UNEXPECTED: helper callable'; exception when insufficient_privilege then raise notice '3b internal helper refused to clients: ok'; end $$;
do $$ begin perform public.notify_match_ended('cccccccc-0000-0000-0000-00000000000c'); raise notice 'UNEXPECTED: notify callable'; exception when insufficient_privilege then raise notice '3c notify helper refused to clients: ok'; end $$;
rollback;

-- ---------- 4. report racing a block (202609231200) ----------
-- C was just blocked by D (2i). C's report must still be recorded.
begin; set local role authenticated; select pg_temp.as_user('cccccccc-0000-0000-0000-00000000000c');
select '4a report after being blocked seconds ago (want ok true): '::text || public.report_partner('c1000000-0000-0000-0000-000000000001', 'safety_concern', 'was mid-report');
commit;
select '4b recorded, met kept (want safety_concern met=true): '::text || category || ' met=' || met from public.user_reports where reporter_user_id = 'cccccccc-0000-0000-0000-00000000000c';
select '4c block both ways now (want 2): '::text || count(*) from public.user_blocks where blocker_id in ('cccccccc-0000-0000-0000-00000000000c','dddddddd-0000-0000-0000-00000000000d') and blocked_id in ('cccccccc-0000-0000-0000-00000000000c','dddddddd-0000-0000-0000-00000000000d');
select '4d D not notified of the report (want 0): '::text || count(*) from public.notifications where user_id = 'dddddddd-0000-0000-0000-00000000000d';
