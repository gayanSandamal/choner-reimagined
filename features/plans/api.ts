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

export const setDistanceAnswer = (planId: string, value: string) =>
  rpc<PlanResult>('set_distance_answer', { p_plan_id: planId, p_value: value });
export const proposePlanValue = (planId: string, field: string, value: unknown) =>
  rpc<PlanResult>('propose_plan_value', { p_plan_id: planId, p_field: field, p_value: value });
export const acceptPlanProposal = (proposalId: string) =>
  rpc<PlanResult>('accept_plan_proposal', { p_proposal_id: proposalId });
export const withdrawPlanProposal = (proposalId: string) =>
  rpc<PlanResult>('withdraw_plan_proposal', { p_proposal_id: proposalId });
export const requestPlanHelp = (planId: string, field: string) =>
  rpc<PlanResult>('request_plan_help', { p_plan_id: planId, p_field: field });
export const confirmPlan = (planId: string) => rpc<PlanResult>('confirm_plan', { p_plan_id: planId });
export const startMeetupPlan = (userChallengeId: string) =>
  rpc<PlanResult>('start_meetup_plan', { p_user_challenge_id: userChallengeId });

export async function searchPlaces(input: string, sessionToken: string) {
  const { data, error } = await supabase.functions.invoke('places-autocomplete', {
    body: { input, sessionToken }
  });
  if (error) return [] as { name: string; detail: string | null }[];
  return ((data as any)?.suggestions ?? []) as { name: string; detail: string | null }[];
}
