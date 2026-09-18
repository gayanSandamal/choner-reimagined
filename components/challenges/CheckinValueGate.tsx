import { useEffect, useState } from 'react';
import { useSetCheckinValue } from '@/features/challenges/hooks';
import {
  subscribeCheckinValue,
  type CheckinValueRequest
} from '@/features/challenges/checkin-value-bus';
import { CheckinValueOverlay } from '@/components/challenges/CheckinValueOverlay';

// Renders the post-check-in number prompt wherever the user happened to log
// from. useCompleteTask raises the request; this is the one place that draws
// it, so none of the three check-in call sites need overlay state.
export function CheckinValueGate() {
  const [request, setRequest] = useState<CheckinValueRequest | null>(null);
  const setValue = useSetCheckinValue();

  useEffect(() => subscribeCheckinValue(setRequest), []);

  if (!request) return null;

  return (
    <CheckinValueOverlay
      activityKey={request.activityKey}
      unit={request.unit}
      metricType={request.metricType}
      initialValue={request.initialValue}
      isFirstNumber={request.isFirstNumber}
      busy={setValue.isPending}
      onSubmit={(value) => {
        setValue.mutate({ checkinId: request.checkinId, value });
        setRequest(null);
      }}
      // Skipping is fine — the check-in itself already landed. The number is
      // a bonus, not a gate on having shown up.
      onSkip={() => setRequest(null)}
    />
  );
}
