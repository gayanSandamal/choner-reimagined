import { Platform, Share } from 'react-native';
import * as Linking from 'expo-linking';

// Where an invite points (#193).
//
// It used to go out as choner:///invite/<36 characters>, an address only the
// app itself understands. No chat app treats that as a link, so in WhatsApp it
// could not be tapped and drew no preview.
//
// It becomes an ordinary web address carrying the six-character code:
//   https://app.choner.io/invite/WALW89
// which is blue and tappable everywhere, gets a preview card from the page's
// og: tags (web/invite/index.html), opens the app straight on the invite when
// it is installed (app.json has claimed this host since before TestFlight),
// and opens a small page with the code when it is not.
export const INVITE_WEB_ORIGIN = 'https://app.choner.io';

// ON since 10 Nov 2026, once app.choner.io was serving web/invite (the page,
// the preview picture and Apple's association file all checked live). Turn it
// off again, and nothing else, if that host ever goes away: invites fall back
// to the app's own choner:// address.
export const INVITE_WEB_LIVE = true;

// The address for an invite. The short code when there is one, because it is
// what a person can read and retype; the long token still works in its place
// for invites made before codes existed (app/invite/[token].tsx takes either).
export function buildInviteLink(token: string, code?: string | null, live = INVITE_WEB_LIVE) {
  if (live) return `${INVITE_WEB_ORIGIN}/invite/${encodeURIComponent(code?.trim() || token)}`;
  // The app's own origin: choner://invite/<token> on native,
  // http://<host>/invite/<token> on web.
  return Linking.createURL(`/invite/${token}`);
}

// What goes in the share sheet. Kept apart from the sharing so it can be
// tested without a phone.
export function inviteMessage(
  token: string,
  inviterName?: string | null,
  code?: string | null,
  // The person's own words. The link and code are always appended, so the
  // message, the link and the code travel together whatever they wrote.
  customMessage?: string | null,
  live = INVITE_WEB_LIVE
) {
  const url = buildInviteLink(token, code, live);
  // The code works for someone who does not have the app yet, so a shared
  // message always carries both.
  const withCode = code ? ` Or open Choner, tap "I have an invite code" and enter ${code}.` : '';
  if (customMessage?.trim()) return `${customMessage.trim()}\n${url}${code ? `\nCode: ${code}` : ''}`;
  return inviterName
    ? `${inviterName} invited you to a Choner challenge. Join here: ${url}${withCode}`
    : `Join my Choner challenge: ${url}${withCode}`;
}

// Copies the link (web) or opens the native share sheet. Returns how it was
// handled so the caller can show honest feedback.
export async function shareInviteLink(
  token: string,
  inviterName?: string | null,
  code?: string | null,
  customMessage?: string | null
): Promise<'copied' | 'shared' | 'failed'> {
  const message = inviteMessage(token, inviterName, code, customMessage);

  if (Platform.OS === 'web') {
    try {
      await navigator.clipboard.writeText(customMessage?.trim() ? message : buildInviteLink(token, code));
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
