import AsyncStorage from '@react-native-async-storage/async-storage';

// When someone opens an invite link while signed out, the root auth gate
// bounces them to /welcome before they can accept. We stash the token here so
// it survives sign-in/sign-up and gets accepted once a session exists.
const KEY = 'pending_invite_token';

export async function setPendingInviteToken(token: string) {
  try {
    await AsyncStorage.setItem(KEY, token);
  } catch {
    // best-effort — a lost token just means the user re-opens the link
  }
}

export async function getPendingInviteToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export async function clearPendingInviteToken() {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
