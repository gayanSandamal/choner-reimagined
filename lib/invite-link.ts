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
  inviterName?: string | null
): Promise<'copied' | 'shared' | 'failed'> {
  const url = buildInviteLink(token);
  const message = inviterName
    ? `${inviterName} invited you to a Choner challenge. Join here: ${url}`
    : `Join my Choner challenge: ${url}`;

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
