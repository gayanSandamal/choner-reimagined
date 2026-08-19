import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from './api';
import * as milestones from './milestones';

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
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createInvite,
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ['pending-invites', vars.inviterId] }),
  });
}

export function usePendingInvites(userId: string | undefined) {
  return useQuery({
    queryKey: ['pending-invites', userId],
    queryFn: () => api.listMyPendingInvites(userId!),
    enabled: Boolean(userId),
  });
}

export function useResendInvite() {
  return useMutation({ mutationFn: api.resendInvite });
}

export function useAcceptInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (token: string) => api.acceptInvite(token),
    onSuccess: () => {
      // Both fires may have just lit — refresh challenges, streak, and the
      // partner-status read that Home's partner card depends on.
      qc.invalidateQueries({ queryKey: ['my-challenge'] });
      qc.invalidateQueries({ queryKey: ['partner-status'] });
      qc.invalidateQueries({ queryKey: ['pending-invites'] });
    },
  });
}

export function usePartnerStatus(userId: string | undefined) {
  return useQuery({
    queryKey: ['partner-status', userId],
    queryFn: () => api.getPartnerStatus(userId!),
    enabled: Boolean(userId),
  });
}

export function useReportContent() {
  return useMutation({ mutationFn: api.reportContent });
}

// ---- Community milestones ----

export function useCityFeed() {
  return useQuery({
    queryKey: ['city-feed'],
    queryFn: () => milestones.getCityFeed(),
  });
}

// Which milestone prompts this user has already answered for a challenge, so
// the prompt can stay quiet about ones they've seen.
export function useDecidedMilestones(userId: string | undefined, userChallengeId: string | null) {
  return useQuery({
    queryKey: ['decided-milestones', userId, userChallengeId],
    queryFn: () => milestones.getDecidedMilestoneKinds(userId!, userChallengeId),
    enabled: Boolean(userId),
  });
}

export function useRecordMilestoneDecision() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: milestones.recordMilestoneDecision,
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['decided-milestones', vars.userId] });
      qc.invalidateQueries({ queryKey: ['city-feed'] });
    },
  });
}

export function useToggleMilestoneReaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: milestones.toggleMilestoneReaction,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['city-feed'] }),
  });
}
