import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  blockMilestoneSharer,
  blockPartner,
  endMyMatch,
  getPairingMet,
  reportMatch,
  reportPartner
} from './api';

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
      'partner-reflections',
      'my-partner',
      'pair-plan'
    ]) {
      queryClient.invalidateQueries({ queryKey: [key] });
    }
  };
}

export function useBlockPartner() {
  const invalidate = useInvalidatePairing();
  return useMutation({ mutationFn: blockPartner, onSuccess: invalidate });
}

// Blocking from Community drops the person out of the feed and the directory,
// and ends the pairing if there was one — so the feed has to be refetched on
// top of everything a pairing change touches.
export function useBlockMilestoneSharer() {
  const queryClient = useQueryClient();
  const invalidatePairing = useInvalidatePairing();
  return useMutation({
    mutationFn: blockMilestoneSharer,
    onSuccess: () => {
      invalidatePairing();
      queryClient.invalidateQueries({ queryKey: ['city-feed'] });
      queryClient.invalidateQueries({ queryKey: ['active-directory'] });
    }
  });
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

export function useEndMyMatch() {
  const invalidate = useInvalidatePairing();
  return useMutation({ mutationFn: endMyMatch, onSuccess: invalidate });
}
