import { supabase } from '@/lib/supabase';
import type { PairPlan } from './types';

export type PlanResult = { ok: true; [k: string]: unknown } | { ok: false; reason: string };

async function rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await (supabase.rpc as any)(fn, args);
  if (error) throw error;
  return data as T;
}

// The caller's open plan on this challenge, as "me" and "them". Null when
// there is none — most pairs, and every pair that isn't Running/Walking/Cycling.
export const getPairPlan = (userChallengeId: string) =>
  rpc<PairPlan | null>('get_pair_plan', { p_user_challenge_id: userChallengeId });

export const sendPairMessage = (planId: string, key: string) =>
  rpc<PlanResult>('send_pair_message', { p_plan_id: planId, p_key: key });
