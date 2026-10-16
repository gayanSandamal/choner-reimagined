-- Invites that ran out were never marked, so they stayed 'pending' for ever.
--
-- Expiry was enforced in exactly one place: a BEFORE UPDATE trigger
-- (202609291300) that raises an exception when someone tries to accept past
-- expires_at. Nothing ever wrote the row off. So:
--
--   * listMyPendingInvites returned a dead invite beside a live one,
--   * Find printed its code under the words GOOD FOR 48 HOURS, and
--   * the inviter stayed at partner_state 'invited', which get_match_pool
--     excludes, so they were quietly unmatchable for as long as they left it.
--
-- One real account sat like that for over a day (15 October 2026). The client
-- now compares expires_at itself, so the screen is honest with or without
-- this; this makes the DATA honest too, which matters for anyone reading the
-- table rather than the app.
--
-- WHAT THIS DELIBERATELY DOES NOT DO: touch user_challenges.partner_state.
-- Returning someone to the pool is their decision, not a cron's. The screen
-- offers them a match, another invite, or the directory, and until they pick
-- one they stay where they are. Decided 16 October 2026.

-- 'expired' joins the existing vocabulary ('pending', 'accepted', ...). A
-- check constraint on status would have to allow it; there is none today, so
-- nothing to widen.
create or replace function public.expire_stale_invites()
returns integer
language sql
security definer
set search_path = public
as $$
  with done as (
    update public.challenge_invites
       set status = 'expired'
     where status = 'pending'
       and expires_at is not null
       and expires_at <= now()
    returning 1
  )
  select count(*)::integer from done;
$$;

comment on function public.expire_stale_invites() is
  'Marks invites that ran out. Does NOT change partner_state: returning '
  'someone to the match pool is their own decision, made on the Find screen.';

revoke all on function public.expire_stale_invites() from public;

-- Hourly. The window is 48 hours, so an hour of lag is invisible to anyone,
-- and the client already decides from expires_at in real time regardless.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule('expire-stale-invites')
      where exists (select 1 from cron.job where jobname = 'expire-stale-invites');
    perform cron.schedule(
      'expire-stale-invites',
      '7 * * * *',
      $cron$select public.expire_stale_invites();$cron$
    );
  end if;
end
$$;

-- Clear the backlog once, now.
select public.expire_stale_invites();
