import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from './api';

export function useActiveConversation(userId: string | undefined) {
  return useQuery({
    queryKey: ['ai-conversation-active', userId],
    queryFn: () => api.getOrCreateActiveConversation(userId!),
    enabled: Boolean(userId),
  });
}

export function useAIMessages(conversationId: string | undefined) {
  return useQuery({
    queryKey: ['ai-messages', conversationId],
    queryFn: () => api.getMessages(conversationId!),
    enabled: Boolean(conversationId),
  });
}

export function useSendAIMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.sendMessage,
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['ai-messages', vars.conversationId] });
      qc.invalidateQueries({ queryKey: ['ai-today-count'] });
    },
  });
}

export function useTodayAICount(userId: string | undefined) {
  return useQuery({
    queryKey: ['ai-today-count', userId],
    queryFn: () => api.getTodayMessageCount(userId!),
    enabled: Boolean(userId),
  });
}
