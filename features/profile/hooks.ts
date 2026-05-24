import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from './api';

export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: () => api.getProfile(userId!),
    enabled: Boolean(userId),
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, payload }: { userId: string; payload: Parameters<typeof api.updateProfile>[1] }) =>
      api.updateProfile(userId, payload),
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ['profile', vars.userId] }),
  });
}

export function useUploadAvatar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.uploadAvatar,
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ['profile', vars.userId] }),
  });
}

export function useChangePassword() {
  return useMutation({ mutationFn: api.changePassword });
}

export function useDeleteAccount() {
  return useMutation({ mutationFn: api.deleteAccount });
}
