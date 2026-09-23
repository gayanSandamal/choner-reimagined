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

export const setArrival = (planId: string, state: 'on_my_way' | 'here') =>
  rpc<PlanResult>('set_arrival', { p_plan_id: planId, p_state: state });
export const relayResponse = (planId: string, choice: 'here_too' | 'on_my_way' | 'cant_make_it') =>
  rpc<PlanResult>('relay_response', { p_plan_id: planId, p_choice: choice });
export const issueSessionQr = (planId: string) =>
  rpc<{ ok: true; payload: string; expires_at: string } | { ok: false; reason: string }>('issue_session_qr', {
    p_plan_id: planId
  });
export const verifySessionQr = (payload: string) => rpc<PlanResult>('verify_session_qr', { p_payload: payload });
export const finishSession = (planId: string) => rpc<PlanResult>('finish_session', { p_plan_id: planId });
export const setSessionCheckin = (planId: string, state: 'done' | 'later' | 'cant', reason?: string | null) =>
  rpc<PlanResult>('set_session_checkin', { p_plan_id: planId, p_state: state, p_reason: reason ?? null });
export const proposeReschedule = (planId: string, startsAt: string) =>
  rpc<PlanResult>('propose_reschedule', { p_plan_id: planId, p_starts_at: startsAt });
export const acceptReschedule = (proposalId: string) =>
  rpc<PlanResult>('accept_reschedule', { p_proposal_id: proposalId });
export const sendEncouragement = (planId: string) => rpc<PlanResult>('send_encouragement', { p_plan_id: planId });
