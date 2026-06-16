import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';
import { SignInInput, SignUpInput } from './schema';

export async function signIn(values: SignInInput) {
  const { error } = await supabase.auth.signInWithPassword(values);
  if (error) throw error;
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

  if (!data.session) {
    // Email confirmation required — sign in will fail until verified.
    return { needsVerification: true } as const;
  }

  if (data.user) {
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: data.user.id,
      full_name: values.fullName,
    });
    if (profileError) throw profileError;
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
