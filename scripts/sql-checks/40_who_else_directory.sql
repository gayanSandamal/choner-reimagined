-- P3 (202609231500): opt-in only, withheld below five, no self, no blocks.
\set ON_ERROR_STOP 1
\pset tuples_only on
\pset format unaligned
delete from auth.users where email like '%@p3.io';
insert into auth.users (id, email, instance_id, aud, role)
select ('33333333-0000-0000-0000-00000000000' || n)::uuid, 'u' || n || '@p3.io', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'
from generate_series(1, 7) n;
update public.profiles set full_name = 'User' || right(id::text, 1) || ' Test' where id::text like '33333333%';
insert into public.user_challenges (user_id, challenge_template_id, accountability_mode, status, partner_state, commitment_value, days_per_week)
select id, (select id from public.challenge_templates where is_active order by sort_order, id limit 1), 'partner', 'active', 'solo', 5, 7
from public.profiles where id::text like '33333333%';
create or replace function pg_temp.dir_as(uid text) returns jsonb language plpgsql as $$
begin perform set_config('request.jwt.claim.sub', uid, true); return public.get_active_directory(); end $$;

-- Only four opted in (users 2-5): below the floor.
update public.profiles set show_in_directory = true where id::text like '33333333%' and right(id::text,1) in ('2','3','4','5');
begin; set local role authenticated;
select 'a four listed -> withheld (want visible=false rows=0): '::text || (d->>'visible') || ' ' || jsonb_array_length(d->'rows') from (select pg_temp.dir_as('33333333-0000-0000-0000-000000000001') d) x;
commit;
-- User 1 opts in through the RPC: now five.
begin; set local role authenticated;
select set_config('request.jwt.claim.sub','33333333-0000-0000-0000-000000000001',true);
select public.set_show_in_directory(true);
commit;
begin; set local role authenticated;
select 'b viewer 6 (not listed) sees five (want true 5 false): '::text || (d->>'visible') || ' ' || jsonb_array_length(d->'rows') || ' ' || (d->>'me_listed') from (select pg_temp.dir_as('33333333-0000-0000-0000-000000000006') d) x;
select 'c listed viewer never sees self (want 4 rows -> withheld false): '::text || (d->>'visible') from (select pg_temp.dir_as('33333333-0000-0000-0000-000000000001') d) x;
select 'd no ids leak (want no id keys): '::text || coalesce((select string_agg(k, ',') from jsonb_array_elements(d->'rows') r, jsonb_object_keys(r) k where k like '%id%'), 'none') from (select pg_temp.dir_as('33333333-0000-0000-0000-000000000006') d) x;
commit;
-- Viewer 7 blocks user 2: then 7 sees only four -> withheld.
insert into public.user_blocks (blocker_id, blocked_id) values ('33333333-0000-0000-0000-000000000007','33333333-0000-0000-0000-000000000002');
begin; set local role authenticated;
select 'e blocks hide both ways (want 7:false, 2 sees 4 others -> false): '::text || (pg_temp.dir_as('33333333-0000-0000-0000-000000000007')->>'visible') || ' ' || (pg_temp.dir_as('33333333-0000-0000-0000-000000000002')->>'visible');
commit;
