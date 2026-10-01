-- A 'cadence' proposal could not be stored.
--
-- 202610020910 taught propose_plan_value() and accept_plan_proposal() the new
-- field, but pair_proposals has its own check on `field`, and that list still
-- ended at 'reschedule'. Every cadence suggestion failed on insert with
-- pair_proposals_field_check. Found on the first live test, before any client
-- could send one.

alter table public.pair_proposals
  drop constraint if exists pair_proposals_field_check;
alter table public.pair_proposals
  add constraint pair_proposals_field_check
  check (field in ('distance', 'cadence', 'mode', 'place', 'time', 'day_time', 'reschedule'));
