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

import {
  acceptPlanProposal,
  confirmPlan,
  proposePlanValue,
  requestPlanHelp,
  setDistanceAnswer,
  startMeetupPlan,
  withdrawPlanProposal
} from './api';

export const useSetDistanceAnswer = () =>
  usePlanMutation(({ planId, value }: { planId: string; value: string }) => setDistanceAnswer(planId, value));
export const useProposePlanValue = () =>
  usePlanMutation(({ planId, field, value }: { planId: string; field: string; value: unknown }) =>
    proposePlanValue(planId, field, value)
  );
export const useAcceptPlanProposal = () => usePlanMutation((id: string) => acceptPlanProposal(id));
export const useWithdrawPlanProposal = () => usePlanMutation((id: string) => withdrawPlanProposal(id));
export const useRequestPlanHelp = () =>
  usePlanMutation(({ planId, field }: { planId: string; field: string }) => requestPlanHelp(planId, field));
export const useConfirmPlan = () => usePlanMutation((planId: string) => confirmPlan(planId));
export const useStartMeetupPlan = () => usePlanMutation((ucId: string) => startMeetupPlan(ucId));
