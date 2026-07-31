-- Verification features 1 & 2: how a check-in is proved, and the photo itself.
--
-- proof_type is 'tap' by default on purpose. The spec is explicit that photo
-- verification must not be forced onto habits it does not fit, so a habit only
-- demands a photo when someone opts it in — a new template can never silently
-- start requiring one.
--
-- Only onboarding-walk-10min qualifies today. The spec itself names deep
-- breathing, morning water and no-screens as non-photographable; sleep and
-- consistency have no physical artifact; and 7-day-energy-reset is a composite
-- ("steps, hydration, wind-down") where most components cannot be photographed.

-- ============================================================
-- 1. proof_type
-- ============================================================
alter table public.challenge_templates
  add column if not exists proof_type text not null default 'tap';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'challenge_templates_proof_type_check'
  ) then
    alter table public.challenge_templates
      add constraint challenge_templates_proof_type_check
      check (proof_type in ('photo', 'tap'));
  end if;
end $$;

-- Nullable override: a single task inside a template can differ. Null means
-- "inherit the template", which is what every task does today.
alter table public.challenge_tasks
  add column if not exists proof_type text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'challenge_tasks_proof_type_check'
  ) then
    alter table public.challenge_tasks
      add constraint challenge_tasks_proof_type_check
      check (proof_type is null or proof_type in ('photo', 'tap'));
  end if;
end $$;

update public.challenge_templates
set proof_type = 'photo'
where slug = 'onboarding-walk-10min';

-- ============================================================
-- 2. The photo itself
-- ============================================================
-- Storage path only (bucket is private); never a public URL. Nullable because
-- every 'tap' check-in has no photo, and so does every check-in made before
-- this shipped.
alter table public.task_checkins
  add column if not exists photo_path text;

-- ============================================================
-- 3. Resolving the effective proof type
-- ============================================================
-- Task override wins, else the template. Kept in SQL so the client and any
-- future server-side check agree on one definition.
create or replace function public.effective_proof_type(p_task_id uuid)
returns text
language sql
stable
as $$
  select coalesce(
    ct.proof_type,
    tmpl.proof_type,
    'tap'
  )
  from public.challenge_tasks ct
  join public.user_challenges uc on uc.id = ct.user_challenge_id
  left join public.challenge_templates tmpl on tmpl.id = uc.challenge_template_id
  where ct.id = p_task_id;
$$;

grant execute on function public.effective_proof_type(uuid) to authenticated;
