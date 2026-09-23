import { AppText } from '@/components/ui/AppText';
import type { PlanStep } from '@/features/plans/steps';
import type { PairPlan } from '@/features/plans/types';

// Steps after Say Hi. Filled in by P5 (planning), P6 (day of, QR, check-in)
// and P7 (completion); until a step exists it says so plainly.
export function PlanStepBody({
  plan,
  step
}: {
  plan: PairPlan;
  step: PlanStep;
  me: { name: string; avatarUrl: string | null };
  challengeId: string;
}) {
  if (step === 'ended') return <AppText muted>This match has ended.</AppText>;
  return <AppText muted>Planning with {plan.them.first_name} continues here soon.</AppText>;
}
