import { useQuery } from '@tanstack/react-query';
import { useSession } from '@/providers/session-provider';
import { getSubscription, isPremium } from './api';

export function useSubscription() {
  const { session } = useSession();
  const userId = session?.user.id;
  return useQuery({
    queryKey: ['subscription', userId],
    queryFn: () => getSubscription(userId!),
    enabled: Boolean(userId),
    staleTime: 30_000,
  });
}

export function useIsPremium() {
  const { session } = useSession();
  const userId = session?.user.id;
  const q = useQuery({
    queryKey: ['is-premium', userId],
    queryFn: () => isPremium(userId!),
    enabled: Boolean(userId),
    staleTime: 30_000,
  });
  return { ...q, isPremium: q.data ?? false };
}
