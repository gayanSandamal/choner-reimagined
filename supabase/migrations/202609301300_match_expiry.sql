-- SCHEMA_CHALLENGES.md §4: a match expires 24 hours after it is created.
--
-- One clock, started at created_at, and both people see the same number: not
-- one clock each, because 'pending' exists precisely when one has answered and
-- the other has not. status already allows 'expired'.
--
-- (Invite codes expire after 48h; that is section 5 of
-- 202609291300_short_invite_code.sql and is not repeated here.)

alter table public.partner_matches
  add column if not exists expires_at timestamptz;

update public.partner_matches
set expires_at = created_at + interval '24 hours'
where expires_at is null;

alter table public.partner_matches
  alter column expires_at set default (now() + interval '24 hours'),
  alter column expires_at set not null;

create index if not exists partner_matches_pending_expiry_idx
  on public.partner_matches (expires_at)
  where status = 'pending';

-- Expire what has run out. On expiry both go back in the pool, exactly as
-- decline_match() releases them (202609182300): neither did anything wrong.
create or replace function public.sweep_expired_matches()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_n int := 0;
begin
  for r in
    select * from public.partner_matches
    where status = 'pending' and expires_at <= now()
    for update skip locked
  loop
    update public.partner_matches
    set status = 'expired', updated_at = now()
    where id = r.id;

    update public.partner_match_requests
    set status = 'waiting', no_match_at = null, updated_at = now()
    where user_challenge_id in (r.user_challenge_a, r.user_challenge_b)
      and status = 'matched';

    update public.user_challenges
    set partner_state = 'finding'
    where id in (r.user_challenge_a, r.user_challenge_b)
      and status in ('active', 'pending', 'paused');

    v_n := v_n + 1;
  end loop;
  return v_n;
end;
$$;

revoke all on function public.sweep_expired_matches() from public, anon, authenticated;

do $$
begin
  perform cron.unschedule('choner-expire-matches');
exception when others then
  null; -- not scheduled yet
end $$;

select cron.schedule(
  'choner-expire-matches',
  '*/15 * * * *',
  $cron$select public.sweep_expired_matches()$cron$
);

-- A migration that schedules a job must end with this; see
-- 202608211600_cron_reload.sql for why.
select pg_reload_conf();
