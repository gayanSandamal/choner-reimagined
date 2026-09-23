import { supabase } from '@/lib/supabase';
import type { ReportCategory, SafetyRefusal } from './rules';

export type SafetyResult = { ok: true } | { ok: false; reason: SafetyRefusal };

// Every call names the caller's own challenge or match, never a user id. The
// server resolves who is on the other end, so a client can't block or report
// somebody it was never paired with.

export async function blockPartner(userChallengeId: string): Promise<SafetyResult> {
  const { data, error } = await (supabase.rpc as any)('block_partner', {
    p_user_challenge_id: userChallengeId
  });
  if (error) throw error;
  return data as SafetyResult;
}

export async function reportPartner(input: {
  userChallengeId: string;
  category: ReportCategory;
  freeText?: string | null;
}): Promise<SafetyResult> {
  const { data, error } = await (supabase.rpc as any)('report_partner', {
    p_user_challenge_id: input.userChallengeId,
    p_category: input.category,
    p_free_text: input.freeText ?? null
  });
  if (error) throw error;
  return data as SafetyResult;
}

// From Match Found, before either side has accepted.
export async function reportMatch(input: {
  matchId: string;
  category: ReportCategory;
  freeText?: string | null;
}): Promise<SafetyResult> {
  const { data, error } = await (supabase.rpc as any)('report_match', {
    p_match_id: input.matchId,
    p_category: input.category,
    p_free_text: input.freeText ?? null
  });
  if (error) throw error;
  return data as SafetyResult;
}

// Decides which report categories to offer. Advisory only — the server
// re-checks when the report is submitted.
export async function getPairingMet(userChallengeId: string): Promise<boolean> {
  const { data, error } = await (supabase.rpc as any)('my_pairing_met', {
    p_user_challenge_id: userChallengeId
  });
  if (error) throw error;
  return Boolean(data);
}
