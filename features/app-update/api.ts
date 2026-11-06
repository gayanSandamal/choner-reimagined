import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';
import { supabase } from '@/lib/supabase';

// What the store is serving, and how to get there.
//
// The row comes from public.app_releases (202611061000). Nothing in it is
// secret — a store listing says the same thing to anyone — so it is read
// straight off the table rather than through a definer function.

export type StorePlatform = 'ios' | 'android';

export type AppRelease = {
  platform: StorePlatform;
  latest_version: string;
  store_url: string;
  notes: string | null;
};

/**
 * The version this binary calls itself, as a string like '0.2.0'.
 *
 * `expoConfig.version` is app.json's `version` as it was at build time, which
 * is the same string the store shows. Deliberately NOT `versionCode` or
 * `buildNumber`: eas.json sets `appVersionSource: remote`, so EAS assigns the
 * build number and the one embedded in the manifest is whatever app.json last
 * said — the 3 November build logged that warning verbatim. Comparing those
 * would be comparing a stale number with a real one.
 */
export function installedVersion(): string | null {
  return Constants.expoConfig?.version ?? null;
}

/** The store this device would update from, or null where there isn't one. */
export function storePlatform(): StorePlatform | null {
  if (Platform.OS === 'ios') return 'ios';
  if (Platform.OS === 'android') return 'android';
  // Web runs the same codebase and has no store to send anyone to.
  return null;
}

export async function getLatestRelease(platform: StorePlatform): Promise<AppRelease | null> {
  const { data, error } = await supabase
    .from('app_releases')
    .select('platform, latest_version, store_url, notes')
    .eq('platform', platform)
    .maybeSingle();
  if (error) throw error;
  // No row is the normal state for a platform we have not shipped yet — iOS
  // has no App Store record, so it has no row. Read as "no update".
  return (data as AppRelease | null) ?? null;
}

/**
 * Opens the listing.
 *
 * The plain https URL, not `market://` or `itms-apps://`. Both stores claim
 * their own domain as an app link, so Android hands a play.google.com URL to
 * the Play app and iOS hands an apps.apple.com URL to the App Store — without
 * a scheme that fails outright on a device where the store app is missing, and
 * without a second code path to keep working.
 */
export async function openStoreListing(url: string): Promise<void> {
  await Linking.openURL(url);
}
