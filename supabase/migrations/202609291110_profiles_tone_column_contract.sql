-- CONTRACT STEP. Do not apply this until the app has moved.
--
-- This drops `profiles.accountability_mode` and leaves `accountability_style`
-- as the only name. It is written now so the expand step has a visible end,
-- but applying it early breaks the running app.
--
-- Gate, all three:
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
--      returns 0.
--
-- Check 3 is the one that matters. If it is not 0, something is still writing
-- the old name and dropping the column loses whatever it was writing.

do $$
begin
  if exists (
    select 1 from public.profiles
    where accountability_mode is distinct from accountability_style
  ) then
    raise exception
      'accountability_mode and accountability_style disagree on % row(s) - something is still writing the old name',
      (select count(*) from public.profiles
       where accountability_mode is distinct from accountability_style);
  end if;
end $$;

drop trigger if exists profiles_sync_accountability_style on public.profiles;
drop function if exists public.sync_accountability_style();

alter table public.profiles drop column if exists accountability_mode;

-- user_challenges.accountability_mode is NOT dropped here. It holds
-- 'solo' | 'partner', which is a real accountability mode, and every partner
-- RPC branches on it. Removing solo mode from the data belongs to the
-- Challenges rebuild, where the whole weekly-commitment model lands at once.
