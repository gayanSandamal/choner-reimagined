import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getPairPlan, sendPairMessage } from './api';

// Polls while a plan is open: the other person's answers change it from the
// outside, and most plan steps have no notification of their own.
export function usePairPlan(userChallengeId: string | undefined) {
  return useQuery({
    queryKey: ['pair-plan', userChallengeId],
    queryFn: () => getPairPlan(userChallengeId!),
    enabled: Boolean(userChallengeId),
    refetchInterval: (q) => {
      const s = (q.state.data as any)?.status;
      return s === 'planning' || s === 'confirmed' || s === 'verified' ? 15_000 : false;
    }
  });
}

export function usePlanMutation<A>(fn: (a: A) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pair-plan'] })
  });
}

export const useSendPairMessage = () =>
  usePlanMutation(({ planId, key }: { planId: string; key: string }) => sendPairMessage(planId, key));
