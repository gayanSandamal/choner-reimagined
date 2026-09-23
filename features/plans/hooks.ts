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

import {
  acceptReschedule,
  finishSession,
  issueSessionQr,
  proposeReschedule,
  relayResponse,
  sendEncouragement,
  setArrival,
  setSessionCheckin,
  verifySessionQr
} from './api';

export const useSetArrival = () =>
  usePlanMutation(({ planId, state }: { planId: string; state: 'on_my_way' | 'here' }) => setArrival(planId, state));
export const useRelayResponse = () =>
  usePlanMutation(({ planId, choice }: { planId: string; choice: 'here_too' | 'on_my_way' | 'cant_make_it' }) =>
    relayResponse(planId, choice)
  );
export const useIssueSessionQr = () => usePlanMutation((planId: string) => issueSessionQr(planId));
export const useVerifySessionQr = () => usePlanMutation((payload: string) => verifySessionQr(payload));
export const useFinishSession = () => usePlanMutation((planId: string) => finishSession(planId));
export const useSetSessionCheckin = () =>
  usePlanMutation(({ planId, state, reason }: { planId: string; state: 'done' | 'later' | 'cant'; reason?: string | null }) =>
    setSessionCheckin(planId, state, reason)
  );
export const useProposeReschedule = () =>
  usePlanMutation(({ planId, startsAt }: { planId: string; startsAt: string }) => proposeReschedule(planId, startsAt));
export const useAcceptReschedule = () => usePlanMutation((id: string) => acceptReschedule(id));
export const useSendEncouragement = () => usePlanMutation((planId: string) => sendEncouragement(planId));

import { recordSessionShare, togglePlanReaction } from './api';

export const useTogglePlanReaction = () =>
  usePlanMutation(({ planId, reaction }: { planId: string; reaction: string }) => togglePlanReaction(planId, reaction));
export const useRecordSessionShare = () =>
  usePlanMutation(({ planId, shared }: { planId: string; shared: boolean }) => recordSessionShare(planId, shared));
