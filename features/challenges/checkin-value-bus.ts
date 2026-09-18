// A one-slot pub/sub so the check-in value prompt can be raised from the
// single mutation choke point (useCompleteTask) and rendered by one global
// gate — without each of the three check-in call sites having to own overlay
// state of its own.
//
// Deliberately not react-query state: this is a transient UI event tied to one
// specific mutation resolving, not server state that should survive a refetch.

export interface CheckinValueRequest {
  checkinId: string;
  userChallengeId: string;
  activityKey: string | null;
  unit: string | null;
  metricType: 'distance' | 'duration' | 'reps' | null;
  initialValue: number;
  // The user had no capability recorded, so this number becomes it.
  isFirstNumber: boolean;
}

type Listener = (request: CheckinValueRequest | null) => void;

const listeners = new Set<Listener>();

export function requestCheckinValue(request: CheckinValueRequest) {
  listeners.forEach((l) => l(request));
}

export function clearCheckinValueRequest() {
  listeners.forEach((l) => l(null));
}

export function subscribeCheckinValue(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
