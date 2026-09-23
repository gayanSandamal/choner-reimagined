import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { blockPartner, getPairingMet, reportMatch, reportPartner } from './api';

// Ending a pairing changes nearly everything the pair screens read: the
// challenge drops to solo, the partner and their timeline disappear, and a
// pending match stops existing. One invalidation list, shared by all three.
function useInvalidatePairing() {
  const queryClient = useQueryClient();
  return () => {
    for (const key of [
      'my-challenge',
      'my-match',
      'partner-status',
      'pair-checkins',
      'partner-reflections'
    ]) {
      queryClient.invalidateQueries({ queryKey: [key] });
    }
  };
}

export function useBlockPartner() {
  const invalidate = useInvalidatePairing();
  return useMutation({ mutationFn: blockPartner, onSuccess: invalidate });
}

export function useReportPartner() {
  const invalidate = useInvalidatePairing();
  return useMutation({ mutationFn: reportPartner, onSuccess: invalidate });
}

export function useReportMatch() {
  const invalidate = useInvalidatePairing();
  return useMutation({ mutationFn: reportMatch, onSuccess: invalidate });
}

export function usePairingMet(userChallengeId: string | undefined) {
  return useQuery({
    queryKey: ['pairing-met', userChallengeId],
    queryFn: () => getPairingMet(userChallengeId!),
    enabled: Boolean(userChallengeId)
  });
}
