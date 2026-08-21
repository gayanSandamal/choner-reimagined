import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getTemplates,
  getTemplate,
  getMyChallenge,
  ensureUserChallenge,
  getChallengeHistory,
  startChallenge,
  completeTask,
  undoTaskCheckin,
  setLateNote,
  getTodayStatus,
  pauseChallenge,
  resumeChallenge,
  abandonChallenge,
  getStreak,
  getReflections,
  saveReflections,
  getPartnerReflections,
  setMyChallengeHabit,
  joinMatchPool,
  leaveMatchPool,
  getMyMatch,
  confirmMatch,
  declineMatch,
  nudgePartner,
} from '@/features/challenges/api';

export function useChallengeTemplates() {
  return useQuery({
    queryKey: ['challenge-templates'],
    queryFn: getTemplates,
  });
}

export function useChallengeTemplate(templateId: string | undefined) {
  return useQuery({
    queryKey: ['challenge-template', templateId],
    queryFn: () => getTemplate(templateId!),
    enabled: Boolean(templateId),
  });
}

// The user's single live challenge. One query key everywhere, so a check-in,
// a habit change and a partner joining all invalidate the same thing.
export function useMyChallenge(userId: string | undefined) {
  return useQuery({
    queryKey: ['my-challenge', userId],
    queryFn: () => getMyChallenge(userId!),
    enabled: Boolean(userId),
  });
}

export function useEnsureUserChallenge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ensureUserChallenge,
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ['my-challenge', vars.userId] });
    },
  });
}

export function usePartnerReflections(partnerId: string | undefined) {
  return useQuery({
    queryKey: ['partner-reflections', partnerId],
    queryFn: () => getPartnerReflections(partnerId!),
    enabled: Boolean(partnerId),
  });
}

// ---- finding a partner ----

export function useMyMatch(enabled = true) {
  return useQuery({
    queryKey: ['my-match'],
    queryFn: getMyMatch,
    enabled,
  });
}

export function useJoinMatchPool() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: joinMatchPool,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-challenge'] });
      queryClient.invalidateQueries({ queryKey: ['partner-status'] });
    },
  });
}

export function useLeaveMatchPool() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: leaveMatchPool,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-challenge'] });
      queryClient.invalidateQueries({ queryKey: ['partner-status'] });
    },
  });
}

export function useConfirmMatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: confirmMatch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-match'] });
      queryClient.invalidateQueries({ queryKey: ['my-challenge'] });
      queryClient.invalidateQueries({ queryKey: ['partner-status'] });
    },
  });
}

// Nudge state lives on partner-status (the server knows both timezones), so a
// successful nudge has to invalidate it or the button stays offering a second
// one it would then refuse.
export function useNudgePartner(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: nudgePartner,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-status', userId] });
    },
  });
}

export function useDeclineMatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: declineMatch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-match'] });
      queryClient.invalidateQueries({ queryKey: ['my-challenge'] });
    },
  });
}

// Step 1: apply the chosen habit to the user's challenge.
export function useSetMyChallengeHabit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: setMyChallengeHabit,
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ['my-challenge', vars.userId] });
    },
  });
}

export function useReflections(userId: string | undefined) {
  return useQuery({
    queryKey: ['reflections', userId],
    queryFn: () => getReflections(userId!),
    enabled: Boolean(userId),
  });
}

export function useSaveReflections() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveReflections,
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ['reflections', vars.userId] });
    },
  });
}

export function useChallengeHistory(userId: string | undefined) {
  return useQuery({
    queryKey: ['challenge-history', userId],
    queryFn: () => getChallengeHistory(userId!),
    enabled: Boolean(userId),
  });
}

export function useStreak(userId: string | undefined) {
  return useQuery({
    queryKey: ['streak', userId],
    queryFn: () => getStreak(userId!),
    enabled: Boolean(userId),
  });
}

export function useStartChallenge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: startChallenge,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-challenge'] });
      queryClient.invalidateQueries({ queryKey: ['challenge-templates'] });
    },
  });
}

export function useCompleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: completeTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-challenge'] });
      queryClient.invalidateQueries({ queryKey: ['insights'] });
      queryClient.invalidateQueries({ queryKey: ['streak'] });
    },
  });
}

export function useUndoTaskCheckin() {
  const queryClient = useQueryClient();
  return useMutation({
    // Object arg so the photo path travels with the id — react-query passes a
    // context as the second parameter, so a positional signature can't work.
    mutationFn: (input: { checkinId: string; photoPath?: string | null }) =>
      undoTaskCheckin(input.checkinId, input.photoPath),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-challenge'] });
      queryClient.invalidateQueries({ queryKey: ['streak'] });
    },
  });
}

export function usePauseChallenge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: pauseChallenge,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-challenge'] }),
  });
}

export function useResumeChallenge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: resumeChallenge,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-challenge'] }),
  });
}

export function useAbandonChallenge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: abandonChallenge,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-challenge'] });
      queryClient.invalidateQueries({ queryKey: ['challenge-history'] });
    },
  });
}

export function useTodayStatus(userChallengeId: string | undefined) {
  return useQuery({
    queryKey: ['daily-status', userChallengeId],
    queryFn: () => getTodayStatus(userChallengeId!),
    enabled: Boolean(userChallengeId),
  });
}

export function useSetLateNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { userChallengeId: string; note: string }) =>
      setLateNote(input.userChallengeId, input.note),
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ['daily-status', vars.userChallengeId] });
    },
  });
}
