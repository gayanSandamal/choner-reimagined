import { useQuery } from '@tanstack/react-query';
import { getInsights, getInsightsSeries } from './api';

export function useInsights(userId: string | undefined) {
  return useQuery({
    queryKey: ['insights', userId],
    queryFn: () => getInsights(userId!),
    enabled: Boolean(userId),
  });
}

export function useInsightsSeries(userId: string | undefined, days = 30) {
  return useQuery({
    queryKey: ['insights-series', userId, days],
    queryFn: () => getInsightsSeries(userId!, days),
    enabled: Boolean(userId),
  });
}
