-- Run the matcher automatically, every five minutes.
--
-- Until now "Find a partner" put someone in the pool and left them there: the
-- pairing step was a person running a CLI, so the app searched indefinitely and
-- the screen's "usually a day or two" was literally true. This closes it.
--
-- CONSENT -- the reason this is safe to automate
--
-- Matching only ever sees partner_match_requests, and a row exists there only
-- because the user tapped "Find a partner" and join_match_pool() inserted it.
-- Nobody is matched without asking. leave_match_pool() removes them, and
-- decline_match() deliberately puts both people back to 'waiting' so they are
-- reconsidered -- declining one suggestion is not withdrawing consent to be
-- matched at all.
--
-- Nothing is auto-CONFIRMED. The function writes a 'pending' match and both
-- people still have to say yes in the app before any pairing goes live, which
-- is the part that actually needed to stay a human decision.
--
-- WHY AN EDGE FUNCTION AND NOT PLPGSQL
--
-- The scoring lives in features/challenges/matching.ts and is tested there.
-- PARTNER_MATCHING.md warns specifically against a second copy of the rules, so
-- the edge function imports that module rather than reimplementing it in SQL.
-- pg_cron cannot call TypeScript, so it posts to the function the same way the
-- notification sweeps post to send-push.

create or replace function public.run_partner_matching()
returns void
language plpgsql
security definer
set search_path = public, net, extensions
as $$
declare
  v_key text;
  v_url text;
begin
  select value into v_key from public.app_config where key = 'service_role_key';
  select value into v_url from public.app_config where key = 'functions_base_url';

  if v_key is null or v_url is null then
    raise notice 'run_partner_matching: config missing, nothing done';
    return;
  end if;

  perform net.http_post(
    url := v_url || '/partner-match',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_key
    ),
    body := '{}'::jsonb
  );
end;
$$;

revoke all on function public.run_partner_matching() from public, anon, authenticated;

-- Five minutes: fast enough that tapping Find feels like it did something,
-- slow enough that a pool of 500 is not rescored constantly. Offset from :05
-- and :15, where the two notification sweeps already sit.
do $$
begin
  perform cron.unschedule('choner-partner-matching');
exception when others then
  null; -- not scheduled yet
end $$;

select cron.schedule(
  'choner-partner-matching',
  '2-57/5 * * * *',
  $cron$select public.run_partner_matching()$cron$
);
