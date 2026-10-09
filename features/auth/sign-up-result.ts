// What a successful-looking signUp() response actually means.
//
// With "Confirm email" on, Supabase answers a sign-up for an email that already
// has an account with a 200 and a placeholder user whose identities list is
// empty, and sends no email. That is deliberate, so a sign-up form can't be
// used to probe which addresses are registered, but it means "no session"
// alone does not prove a confirmation email went out. Without this check the
// app showed "Check your email" for a message that was never sent.
//
// Pure on purpose, so it can be unit-tested without supabase.

type SignUpUser = { identities?: unknown[] | null } | null | undefined;

export type SignUpOutcome = 'signed_in' | 'needs_verification' | 'already_registered';

export function signUpOutcome(user: SignUpUser, hasSession: boolean): SignUpOutcome {
  if (hasSession) return 'signed_in';
  if (user && Array.isArray(user.identities) && user.identities.length === 0) {
    return 'already_registered';
  }
  return 'needs_verification';
}
