-- `profiles.accountability_mode` is holding the TONE, not a mode.
--
-- READ THIS BEFORE THE TASK LIST. The handover said "accountability_mode does
-- two jobs" and named one column. There are two columns with that name and
-- they do NOT have the same problem:
--
--   profiles.accountability_mode
--     holds 'competitive' | 'momentum' | 'encouraging' | 'team' - the
--     onboarding "How do you want Choner to talk to you?" answer. It is also
--     CONSUMED as the tone: four matching RPCs read it as
--     `coalesce(p.accountability_mode, 'encouraging') as style`
--     (202608211400:38, 202609182100:35, 202609231000:440, 202609231100:29).
--     So only the NAME and the DEFAULT are wrong. This migration fixes those.
--
--   user_challenges.accountability_mode
--     holds 'solo' | 'partner' and genuinely means an accountability mode.
--     Roughly fifteen migrations and every partner RPC branch on
--     `= 'partner'`. Solo mode is removed from the product, but unpicking that
--     belongs to the Challenges rebuild, not here. This migration only fixes
--     its default so new rows stop being born solo.
--
-- Also worth knowing: 202603261510:23 renamed `accountability_style` to
-- `accountability_mode`. The original name was right; that rename is the bug
-- being undone.
--
-- EXPAND / CONTRACT, on purpose. Two people are working on opposite sides of
-- this column. A straight rename would break every writer the moment it lands
-- and every reader the moment it does not. So: add the new column, backfill,
-- keep both in step with a trigger, and drop the old one in a second migration
-- once the app writes the new name (Dinesh's fe10). Both names work in
-- between, in both directions.

-- ============================================================
-- 1. The new column
-- ============================================================
alter table public.profiles
  add column if not exists accountability_style text;

-- Backfill from whatever is there, dropping the values that were never tones.
-- 'solo' and 'partner' are the dead default and a mode that leaked in; neither
-- is an answer anyone gave, so they become null and the app falls back to
-- 'encouraging' exactly as the matching RPCs already do.
update public.profiles
set accountability_style = accountability_mode
where accountability_style is null
  and accountability_mode in ('competitive', 'momentum', 'encouraging', 'team');

alter table public.profiles
  drop constraint if exists profiles_accountability_style_check;
alter table public.profiles
  add constraint profiles_accountability_style_check
  check (
    accountability_style is null
    or accountability_style in ('competitive', 'momentum', 'encouraging', 'team')
  );

comment on column public.profiles.accountability_style is
  'How Choner talks to you: competitive | momentum | encouraging | team. '
  'Set once at onboarding, editable in Edit profile. Not an accountability mode.';

comment on column public.profiles.accountability_mode is
  'DEPRECATED, being replaced by accountability_style. Kept in step by a '
  'trigger until the app writes the new name. Drop with the contract migration.';

-- ============================================================
-- 2. The dead defaults
-- ============================================================
-- 202603261510:29 gave profiles `default 'solo'`. Solo mode no longer exists,
-- and a tone was never 'solo' in the first place, so every row created since
-- has been born with a value nobody chose. No default at all is correct:
-- absent means unanswered, and the RPCs already coalesce.
alter table public.profiles alter column accountability_mode drop default;

-- Same dead default on the other column (202603261600:49). Its VALUES are
-- load-bearing and are left alone; only the default goes, so a new challenge
-- is not silently born solo.
alter table public.user_challenges alter column accountability_mode drop default;

-- Clear the rows that only ever held the default. A tone of 'solo' was never
-- answered by anyone.
update public.profiles
set accountability_mode = null
where accountability_mode = 'solo';

-- ============================================================
-- 3. Keep both names in step until the app moves
-- ============================================================
-- Whichever side writes, the other follows. This is what makes it safe for the
-- frontend and the backend to land in either order.
--
-- Only real tones cross from the old name to the new one: a legacy 'solo' or
-- 'partner' arriving through accountability_mode would fail the check
-- constraint, so it lands as null instead of failing the write.
create or replace function public.sync_accountability_style()
returns trigger
language plpgsql
as $$
declare
  v_tones constant text[] := array['competitive', 'momentum', 'encouraging', 'team'];
begin
  if tg_op = 'INSERT' then
    if new.accountability_style is null and new.accountability_mode = any(v_tones) then
      new.accountability_style := new.accountability_mode;
    elsif new.accountability_mode is null and new.accountability_style is not null then
      new.accountability_mode := new.accountability_style;
    end if;
    return new;
  end if;

  -- On update, the side that actually changed wins.
  if new.accountability_style is distinct from old.accountability_style then
    new.accountability_mode := new.accountability_style;
  elsif new.accountability_mode is distinct from old.accountability_mode then
    new.accountability_style := case
      when new.accountability_mode = any(v_tones) then new.accountability_mode
      else null
    end;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_sync_accountability_style on public.profiles;
create trigger profiles_sync_accountability_style
  before insert or update on public.profiles
  for each row execute function public.sync_accountability_style();

-- Done when: a profile written through either name comes back the same through
-- both, no column defaults to 'solo', and no row's accountability_style holds
-- anything that is not one of the four tones.
--
-- Verify:
--   select accountability_mode, accountability_style, count(*)
--   from public.profiles group by 1, 2 order by 3 desc;
--
-- NEXT: 202609291110_profiles_tone_column_contract.sql drops the old column.
-- Do NOT run it until the app writes accountability_style
-- (app/profile/edit.tsx and app/onboarding/energy.tsx, both in Dinesh's fe10).
