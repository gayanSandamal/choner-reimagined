import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getTemplates,
  getTemplate,
  getActiveChallenge,
  getDefaultChallenges,
  ensureDefaultChallenges,
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
  setDefaultChallengesHabit,
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

export function useActiveChallenge(userId: string | undefined) {
  return useQuery({
    queryKey: ['active-challenge', userId],
    queryFn: () => getActiveChallenge(userId!),
    enabled: Boolean(userId),
  });
}

export function useDefaultChallenges(userId: string | undefined) {
  return useQuery({
    queryKey: ['default-challenges', userId],
    queryFn: () => getDefaultChallenges(userId!),
    enabled: Boolean(userId),
  });
}

export function useEnsureDefaultChallenges() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ensureDefaultChallenges,
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ['default-challenges', vars.userId] });
      queryClient.invalidateQueries({ queryKey: ['active-challenge', vars.userId] });
    },
  });
}

// Step 1: apply the chosen habit to both default tracks.
export function useSetDefaultChallengesHabit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: setDefaultChallengesHabit,
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ['default-challenges', vars.userId] });
      queryClient.invalidateQueries({ queryKey: ['active-challenge', vars.userId] });
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
      queryClient.invalidateQueries({ queryKey: ['active-challenge'] });
      queryClient.invalidateQueries({ queryKey: ['challenge-templates'] });
    },
  });
}

export function useCompleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: completeTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-challenge'] });
      queryClient.invalidateQueries({ queryKey: ['default-challenges'] });
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
      queryClient.invalidateQueries({ queryKey: ['active-challenge'] });
      queryClient.invalidateQueries({ queryKey: ['default-challenges'] });
      queryClient.invalidateQueries({ queryKey: ['streak'] });
    },
  });
}

export function usePauseChallenge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: pauseChallenge,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['active-challenge'] }),
  });
}

export function useResumeChallenge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: resumeChallenge,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['active-challenge'] }),
  });
}

export function useAbandonChallenge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: abandonChallenge,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-challenge'] });
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
