import { AppText } from '@/components/ui/AppText';
import {
  ConfirmStep,
  DayTimeStep,
  HowMuchStep,
  ModeStep,
  WhenStep,
  WhereStep
} from '@/components/plans/steps/PlanningSteps';
import { CheckinStep, DayOfStep, FinishStep, QrStep } from '@/components/plans/steps/SessionSteps';
import { CompletionStep } from '@/components/plans/steps/CompletionStep';
import { MeetupChat } from '@/components/plans/MeetupChat';
import type { PlanStep } from '@/features/plans/steps';
import type { PairPlan } from '@/features/plans/types';

// Every step after Say Hi. P6 adds day of / QR / finish / check-in and P7
// completion; a step that doesn't exist yet says so plainly.
export function PlanStepBody({
  plan,
  step,
  me,
  challengeId
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
    case 'day_of':
      return <DayOfStep plan={plan} challengeId={challengeId} />;
    case 'qr':
      return <QrStep plan={plan} chat={<MeetupChat plan={plan} challengeId={challengeId} />} />;
    case 'finish':
      return <FinishStep plan={plan} />;
    case 'checkin':
      return <CheckinStep plan={plan} challengeId={challengeId} />;
    case 'completion':
      return <CompletionStep plan={plan} me={me} />;
    case 'ended':
      return <AppText muted>This match has ended.</AppText>;
    default:
      return <AppText muted>See you on the day.</AppText>;
  }
}
