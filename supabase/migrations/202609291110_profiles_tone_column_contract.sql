-- CONTRACT STEP. This file is on `main` but it does NOTHING unless you opt in.
--
-- It drops `profiles.accountability_mode` and leaves `accountability_style` as
-- the only name. Applying it early breaks the running app, so it refuses to run
-- unless you say so explicitly:
--
--   set choner.allow_tone_contract = 'on';
--   -- then run this file
--
-- WHY THE OPT-IN EXISTS. The expand migration (202609291100) installs a trigger
-- that keeps both column names in step. That trigger is the whole point of the
-- expand step, and it also means the old name KEEPS WORKING. So a check of the
-- form "do the two columns disagree?" can never fail while the trigger is
-- installed - it is the trigger's job to make them agree.
--
-- The first draft of this file used exactly that check as its safety gate. It
-- was not a gate. Both files now sit on `main`, and `supabase db push` runs
-- every file in order, so without this opt-in a push would drop the column out
-- from under an app that still writes it.
--
-- Run this only when ALL THREE are true:
--   1. Dinesh's fe10 has merged, so app/profile/edit.tsx and
--      app/onboarding/energy.tsx write accountability_style.
--   2. The four matching RPCs read accountability_style. They currently read
--      `coalesce(p.accountability_mode, 'encouraging') as style` at
--      202608211400:38, 202609182100:35, 202609231000:440 and
--      202609231100:29. Each needs its latest definition re-issued against the
--      new name; the fourth is the live one, but re-issuing all four keeps a
--      `db reset` from replaying an old body that no longer compiles.
--   3. `select count(*) from public.profiles
--       where accountability_mode is distinct from accountability_style;`
--      returns 0. Necessary, not sufficient - see above.
--
-- Check 2 is the one this file can actually test for you, and it does, below.

do $$
declare
  v_optin text := current_setting('choner.allow_tone_contract', true);
  v_fns   text;
begin
  if v_optin is distinct from 'on' then
    raise notice
      'SKIPPED: profiles.accountability_mode was NOT dropped. This is the contract half of an expand/contract pair and it is opt-in. When the app and the RPCs have moved: set choner.allow_tone_contract = ''on''; then re-run.';
    return;
  end if;

  -- Anything still reading the old name by name will break the moment the
  -- column goes. Cheaper to find it here than in a 500 from the matching RPC.
  select string_agg(p.proname, ', ' order by p.proname)
    into v_fns
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.prosrc like '%accountability_mode%'
    and p.proname <> 'sync_accountability_style';

  if v_fns is not null then
    raise exception
      'REFUSED: these functions still reference accountability_mode: %. Re-issue them against accountability_style first.', v_fns;
  end if;

  if exists (
    select 1 from public.profiles
    where accountability_mode is distinct from accountability_style
  ) then
    raise exception
      'REFUSED: accountability_mode and accountability_style disagree on % row(s).',
      (select count(*) from public.profiles
       where accountability_mode is distinct from accountability_style);
  end if;

  drop trigger if exists profiles_sync_accountability_style on public.profiles;
  drop function if exists public.sync_accountability_style();

  execute 'alter table public.profiles drop column if exists accountability_mode';

  raise notice 'profiles.accountability_mode dropped. accountability_style is now the only name.';
end $$;

-- user_challenges.accountability_mode is NOT dropped here. It holds
-- 'solo' | 'partner', which is a real accountability mode, and every partner
-- RPC branches on it. Removing solo mode from the data belongs to the
-- Challenges rebuild, where the whole weekly-commitment model lands at once.
--
-- Verify, after opting in and running:
--   select column_name from information_schema.columns
--   where table_name = 'profiles' and column_name like 'accountability%';
--   -- expect one row: accountability_style
