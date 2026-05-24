import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getTemplates,
  getTemplate,
  getActiveChallenge,
  getChallengeHistory,
  startChallenge,
  completeTask,
  undoTaskCheckin,
  pauseChallenge,
  resumeChallenge,
  abandonChallenge,
  getStreak,
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
      queryClient.invalidateQueries({ queryKey: ['insights'] });
      queryClient.invalidateQueries({ queryKey: ['streak'] });
    },
  });
}

export function useUndoTaskCheckin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: undoTaskCheckin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-challenge'] });
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
