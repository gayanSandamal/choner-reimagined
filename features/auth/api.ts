import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';
import { SignInInput, SignUpInput } from './schema';
import { signUpOutcome } from './sign-up-result';

// Supabase answers "Invalid login credentials" for BOTH a wrong password and
// an email with no account — deliberately, so nobody can probe which addresses
// are registered. We must not undo that by testing whether the account exists,
// so the copy covers both cases and points at sign-up instead of guessing.
export function authErrorMessage(error: unknown): string {
  const raw = (error as { message?: string })?.message ?? '';
  const m = raw.toLowerCase();

  if (m.includes('invalid login credentials')) {
    return "That email and password don't match an account. Check them again, or create an account if you haven't made one yet.";
  }
  if (m.includes('email not confirmed')) {
    return 'Confirm your email first. We sent you a link when you created your account.';
  }
  if (m.includes('already registered') || m.includes('already been registered')) {
    return 'That email already has an account. Try signing in instead.';
  }
  if (m.includes('rate limit') || m.includes('too many')) {
    return 'Too many attempts. Wait a minute and try again.';
  }
  if (m.includes('failed to fetch') || m.includes('network')) {
    return "Couldn't reach Choner. Check your connection and try again.";
  }
  return raw || 'Something went wrong. Please try again.';
}

export async function signIn(values: SignInInput) {
  const { error } = await supabase.auth.signInWithPassword(values);
  if (error) throw error;
}

/* The password, held in memory only, so "Check your email" can finish the job
   itself when the deep link does not come back.
   
   WHY THIS EXISTS: a confirmation-required signUp returns NO session, so there
   is nothing to poll. The only way to learn that someone has verified, without
   the link reopening the app, is to try signing in: it fails with "Email not
   confirmed" until they do, and succeeds the moment they have.
   
   It is never written to disk, never logged, never put in a route param, and
   it is cleared the moment it is used or the screen is left. An app restart
   loses it, which is correct: the screen then sends them to sign in instead. */
let pendingPassword: { email: string; password: string } | null = null;

export function rememberPendingPassword(email: string, password: string) {
  pendingPassword = { email, password };
}
export function takePendingPassword(email: string): string | null {
  if (!pendingPassword || pendingPassword.email !== email) return null;
  return pendingPassword.password;
}
export function forgetPendingPassword() {
  pendingPassword = null;
}

/* Has this person verified yet? Signing in is the probe.
   Returns 'verified' once the session exists (the caller is now logged in),
   'waiting' while the address is still unconfirmed, and 'unknown' when we
   cannot tell, which includes having no password to try. */
export async function checkVerified(email: string): Promise<'verified' | 'waiting' | 'unknown'> {
  const password = takePendingPassword(email);
  if (!password) return 'unknown';
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (data?.session) {
    forgetPendingPassword();
    return 'verified';
  }
  const m = (error?.message ?? '').toLowerCase();
  if (m.includes('not confirmed') || m.includes('email not confirmed')) return 'waiting';
  // Wrong password, rate limit, offline: say so by saying nothing.
  return 'unknown';
}

export async function signUp(values: SignUpInput) {
  const redirectTo = Linking.createURL('/verify-email');
  const { data, error } = await supabase.auth.signUp({
    email: values.email,
    password: values.password,
    options: {
      data: { full_name: values.fullName },
      emailRedirectTo: redirectTo,
    },
  });
  if (error) throw error;

  const outcome = signUpOutcome(data.user, Boolean(data.session));
  if (outcome === 'already_registered') {
    // No email was sent. Same wording Supabase uses when confirmation is off,
    // so authErrorMessage() gives the one "try signing in" message for both.
    throw new Error('User already registered');
  }
  if (outcome === 'needs_verification') {
    // Email confirmation required — sign in will fail until verified. Keep the
    // password in memory so the next screen can poll for the confirmation
    // instead of depending on the deep link coming back.
    rememberPendingPassword(values.email, values.password);
    return { needsVerification: true } as const;
  }

  if (data.user) {
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: data.user.id,
      full_name: values.fullName,
    });
    // Deliberately not thrown (#126). By this point the account exists and the
    // session is live, so throwing showed "Sign up failed" to someone who was
    // already signed in, and their next attempt hit "already registered" - a
    // dead end with no way forward.
    //
    // Nothing is actually lost: on_auth_user_created (202605241200) already
    // inserts the profile row and reads full_name out of raw_user_meta_data,
    // which is the same options.data passed above. This upsert is belt and
    // braces, so a failure is worth a line in the log and nothing more.
    if (profileError) {
      console.warn('[signUp] profile upsert failed, continuing:', profileError.message);
    }
  }
  return { needsVerification: false } as const;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function requestPasswordReset(email: string) {
  const redirectTo = Linking.createURL('/reset-password');
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw error;
}

export async function updatePassword(password: string) {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}

export async function resendVerification(email: string) {
  const { error } = await supabase.auth.resend({ type: 'signup', email });
  if (error) throw error;
}

/**
 * Apple Sign-In bridge. The actual native call lives in the screen because it
 * uses expo-apple-authentication; this just exchanges the identity token.
 */
export async function signInWithAppleIdentityToken(idToken: string, nonce?: string) {
  const { error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: idToken,
    nonce,
  });
  if (error) throw error;
}

export function platformIsIOS() {
  return Platform.OS === 'ios';
}
