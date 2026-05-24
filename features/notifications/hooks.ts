import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from './api';

export function useNotifications(userId: string | undefined) {
  return useQuery({
    queryKey: ['notifications', userId],
    queryFn: () => api.listNotifications(userId!),
    enabled: Boolean(userId),
  });
}

export function useUnreadCount(userId: string | undefined) {
  return useQuery({
    queryKey: ['notifications-unread', userId],
    queryFn: () => api.getUnreadCount(userId!),
    enabled: Boolean(userId),
    refetchInterval: 60_000,
  });
}

export function useMarkRead(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.markRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications', userId] });
      qc.invalidateQueries({ queryKey: ['notifications-unread', userId] });
    },
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.markAllRead,
    onSuccess: (_d, userId) => {
      qc.invalidateQueries({ queryKey: ['notifications', userId] });
      qc.invalidateQueries({ queryKey: ['notifications-unread', userId] });
    },
  });
}

export function useNotificationPreferences(userId: string | undefined) {
  return useQuery({
    queryKey: ['notification-prefs', userId],
    queryFn: () => api.getPreferences(userId!),
    enabled: Boolean(userId),
  });
}

export function useUpdateNotificationPreferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, patch }: { userId: string; patch: Partial<Awaited<ReturnType<typeof api.getPreferences>>> }) =>
      api.updatePreferences(userId, patch),
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ['notification-prefs', vars.userId] }),
  });
}
