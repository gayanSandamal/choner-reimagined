import { AppText } from '@/components/ui/AppText';
import {
  ConfirmStep,
  DayTimeStep,
  HowMuchStep,
  ModeStep,
  WhenStep,
  WhereStep
} from '@/components/plans/steps/PlanningSteps';
import type { PlanStep } from '@/features/plans/steps';
import type { PairPlan } from '@/features/plans/types';

// Every step after Say Hi. P6 adds day of / QR / finish / check-in and P7
// completion; a step that doesn't exist yet says so plainly.
export function PlanStepBody({
  plan,
  step
}: {
  plan: PairPlan;
  step: PlanStep;
  me: { name: string; avatarUrl: string | null };
  challengeId: string;
}) {
  switch (step) {
    case 'how_much':
      return <HowMuchStep plan={plan} />;
    case 'mode':
      return <ModeStep plan={plan} />;
    case 'where':
      return <WhereStep plan={plan} />;
    case 'when':
      return <WhenStep plan={plan} />;
    case 'day_time':
      return <DayTimeStep plan={plan} />;
    case 'confirm':
      return <ConfirmStep plan={plan} />;
    case 'ended':
      return <AppText muted>This match has ended.</AppText>;
    default:
      return <AppText muted>See you on the day.</AppText>;
  }
}
