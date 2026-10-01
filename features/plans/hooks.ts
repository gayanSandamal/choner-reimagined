import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  acceptPlanProposal,
  acceptReschedule,
  answerCancel,
  confirmPlan,
  finishSession,
  getMeetupChat,
  getPairPlan,
  getRepairDebt,
  getStreak,
  issueSessionQr,
  nudgeSession,
  proposeCancel,
  proposePlanValue,
  proposeReschedule,
  recordSessionShare,
  relayResponse,
  requestPlanHelp,
  sendEncouragement,
  sendMeetupMessage,
  sendPairMessage,
  setArrival,
  setDistanceAnswer,
  setRepairPreference,
  setRunningLate,
  setStreakTarget,
  setSessionCheckin,
  startMeetupPlan,
  startRepairPlan,
  togglePlanReaction,
  verifySessionQr,
  withdrawPlanProposal
} from './api';

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

// The session details screen. All four change the plan, so the plan (and the
// streak and debt keyed under it) refresh on success.
export const useSetRunningLate = () =>
  usePlanMutation(({ planId, minutes }: { planId: string; minutes: number }) => setRunningLate(planId, minutes));
export const useNudgeSession = () => usePlanMutation((planId: string) => nudgeSession(planId));
export const useProposeCancel = () => usePlanMutation((planId: string) => proposeCancel(planId));
export const useAnswerCancel = () =>
  usePlanMutation(({ proposalId, agree }: { proposalId: string; agree: boolean }) => answerCancel(proposalId, agree));
export const useSendEncouragement = () => usePlanMutation((planId: string) => sendEncouragement(planId));

export const useTogglePlanReaction = () =>
  usePlanMutation(({ planId, reaction }: { planId: string; reaction: string }) => togglePlanReaction(planId, reaction));
export const useRecordSessionShare = () =>
  usePlanMutation(({ planId, shared }: { planId: string; shared: boolean }) => recordSessionShare(planId, shared));

// A short-lived conversation, so it polls briskly while open and not at all
// once closed.
export function useMeetupChat(planId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['meetup-chat', planId],
    queryFn: () => getMeetupChat(planId!),
    enabled: Boolean(planId) && enabled,
    refetchInterval: (q) => ((q.state.data as any)?.open ? 4_000 : 20_000)
  });
}

export function useSendMeetupMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ planId, body }: { planId: string; body: string }) => sendMeetupMessage(planId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meetup-chat'] })
  });
}

// What the pair owes after a miss. Not polled: it only changes when a session
// is swept as missed or a repair is started, and both invalidate 'pair-plan'.
export function useRepairDebt(userChallengeId: string | undefined) {
  return useQuery({
    queryKey: ['pair-plan', 'repair-debt', userChallengeId],
    queryFn: () => getRepairDebt(userChallengeId!),
    enabled: Boolean(userChallengeId)
  });
}

export function useSetRepairPreference() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ missedPlanId, when }: { missedPlanId: string; when: 'this_week' | 'next_week' }) =>
      setRepairPreference(missedPlanId, when),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pair-plan'] })
  });
}

export function useStartRepairPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (missedPlanId: string) => startRepairPlan(missedPlanId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pair-plan'] })
  });
}

// The row of circles. Keyed under 'pair-plan' so anything that changes a
// session (a check-in, a confirm, a repair) refreshes it for free.
export function useSessionStreak(userChallengeId: string | undefined) {
  return useQuery({
    queryKey: ['pair-plan', 'streak', userChallengeId],
    queryFn: () => getStreak(userChallengeId!),
    enabled: Boolean(userChallengeId)
  });
}

export function useSetStreakTarget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userChallengeId, target }: { userChallengeId: string; target: number }) =>
      setStreakTarget(userChallengeId, target),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pair-plan'] });
      qc.invalidateQueries({ queryKey: ['my-challenge'] });
    }
  });
}
