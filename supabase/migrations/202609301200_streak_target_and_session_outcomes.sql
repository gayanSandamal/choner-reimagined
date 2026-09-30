-- SCHEMA_CHALLENGES.md §4: the streak target, and what a circle can be.
--
-- No streak table (§3): a streak is target_sessions on the challenge plus the
-- session rows that count toward it.

-- The 12 in "a 12 session streak". Presets 10 / 20 / 30 are a UI concern; the
-- column only needs it positive. NULL until asked, which is right after the
-- first plan is accepted — never inside the plan itself, because the plan is a
-- negotiation and the streak is personal.
alter table public.user_challenges
  add column if not exists target_sessions int;

alter table public.user_challenges
  drop constraint if exists user_challenges_target_sessions_check;
alter table public.user_challenges
  add constraint user_challenges_target_sessions_check
  check (target_sessions is null or target_sessions > 0);

-- pair_plans is the session row, so it is what a circle is.
--
-- 'missed': a planned session whose day passed with no check-in (midnight of
-- the planned day, local time). Distinct from 'cancelled'; it draws the marked
-- circle. THIS MIGRATION ONLY MAKES THE VALUE LEGAL. Nothing writes it yet:
-- the sweep needs a decision on whose timezone applies when the two people
-- differ (see the PR description).
alter table public.pair_plans
  drop constraint if exists pair_plans_status_check;
alter table public.pair_plans
  add constraint pair_plans_status_check
  check (status in ('planning', 'confirmed', 'verified', 'completed', 'cancelled', 'ended', 'missed'));

-- A make-up session. It fills the missed circle rather than adding a
-- thirteenth, hence repairs_plan_id.
alter table public.pair_plans
  add column if not exists is_repair boolean not null default false,
  add column if not exists repairs_plan_id uuid references public.pair_plans(id) on delete set null;

alter table public.pair_plans
  drop constraint if exists pair_plans_repair_link_check;
alter table public.pair_plans
  add constraint pair_plans_repair_link_check
  check (repairs_plan_id is null or is_repair);

-- A missed circle can be repaired once.
create unique index if not exists pair_plans_one_repair_per_miss
  on public.pair_plans (repairs_plan_id)
  where repairs_plan_id is not null and status not in ('cancelled', 'ended');
