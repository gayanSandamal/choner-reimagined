import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getTemplates, startChallenge, completeTask } from '@/features/challenges/api';

export function useChallengeTemplates() {
  return useQuery({
    queryKey: ['challenge-templates'],
    queryFn: getTemplates
  });
}

export function useStartChallenge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: startChallenge,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-challenge'] });
      queryClient.invalidateQueries({ queryKey: ['challenge-templates'] });
    }
  });
}

export function useCompleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: completeTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-challenge'] });
      queryClient.invalidateQueries({ queryKey: ['insights'] });
    }
  });
}
