import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from './api';

export function useGroups(opts?: { mineOnly?: boolean; userId?: string }) {
  return useQuery({
    queryKey: ['groups', opts?.mineOnly, opts?.userId],
    queryFn: () => api.listGroups(opts),
  });
}

export function useGroup(groupId: string | undefined) {
  return useQuery({
    queryKey: ['group', groupId],
    queryFn: () => api.getGroup(groupId!),
    enabled: Boolean(groupId),
  });
}

export function useGroupMembers(groupId: string | undefined) {
  return useQuery({
    queryKey: ['group-members', groupId],
    queryFn: () => api.listGroupMembers(groupId!),
    enabled: Boolean(groupId),
  });
}

export function useCreateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createGroup,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['groups'] }),
  });
}

export function useJoinGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.joinGroup,
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['groups'] });
      qc.invalidateQueries({ queryKey: ['group-members', vars.groupId] });
    },
  });
}

export function useLeaveGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.leaveGroup,
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['groups'] });
      qc.invalidateQueries({ queryKey: ['group-members', vars.groupId] });
    },
  });
}

export function usePosts(groupId: string | null | undefined) {
  return useQuery({
    queryKey: ['posts', groupId ?? 'all'],
    queryFn: () => api.listPosts({ groupId: groupId ?? null }),
  });
}

export function usePost(postId: string | undefined) {
  return useQuery({
    queryKey: ['post', postId],
    queryFn: () => api.getPost(postId!),
    enabled: Boolean(postId),
  });
}

export function useComments(postId: string | undefined) {
  return useQuery({
    queryKey: ['comments', postId],
    queryFn: () => api.listComments(postId!),
    enabled: Boolean(postId),
  });
}

export function useCreatePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createPost,
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['posts', vars.groupId ?? 'all'] });
    },
  });
}

export function useCreateComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createComment,
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ['comments', vars.postId] }),
  });
}

export function useReactToPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.reactToPost,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['posts'] }),
  });
}

export function useCreateInvite() {
  return useMutation({ mutationFn: api.createInvite });
}

export function useReportContent() {
  return useMutation({ mutationFn: api.reportContent });
}
