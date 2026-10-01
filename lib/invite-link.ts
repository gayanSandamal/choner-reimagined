import { Platform, Share } from 'react-native';
import * as Linking from 'expo-linking';

// Builds the accept URL for an invite token. Uses the app's own origin so the
// link is correct in every context: choner://invite/<token> on native,
// http://<host>/invite/<token> on web.
export function buildInviteLink(token: string) {
  return Linking.createURL(`/invite/${token}`);
}

// Copies the link (web) or opens the native share sheet. Returns how it was
// handled so the caller can show honest feedback.
export async function shareInviteLink(
  token: string,
  inviterName?: string | null,
  code?: string | null
): Promise<'copied' | 'shared' | 'failed'> {
  const url = buildInviteLink(token);
  // The link only opens for someone who already has the app. The code works
  // for everyone else, so a shared message carries both.
  const withCode = code ? ` Or open Choner, tap "I have an invite code" and enter ${code}.` : '';
  const message = inviterName
    ? `${inviterName} invited you to a Choner challenge. Join here: ${url}${withCode}`
    : `Join my Choner challenge: ${url}${withCode}`;

  if (Platform.OS === 'web') {
    try {
      await navigator.clipboard.writeText(url);
      return 'copied';
    } catch {
      return 'failed';
    }
  }

  try {
    await Share.share({ message });
    return 'shared';
  } catch {
    return 'failed';
  }
}
