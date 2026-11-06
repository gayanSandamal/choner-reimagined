import { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as api from './api';
import { dismissUpdate, isUpdateDismissed } from './dismissal';
import { updateAvailable } from './version';
import { notify } from '@/lib/alert';

/**
 * The update notice's whole state: whether to show it, what it is offering,
 * and the two things it can do.
 *
 * Silent on every failure. No row, an unparseable version, a store we have
 * not shipped to, a request that failed — all of them mean `visible: false`,
 * because an update notice is an extra, and a broken extra should be
 * invisible rather than an error on somebody's Home screen.
 */
export function useUpdateNotice() {
  const platform = api.storePlatform();

  const releaseQ = useQuery({
    queryKey: ['app-release', platform],
    queryFn: () => api.getLatestRelease(platform!),
    enabled: Boolean(platform),
    // Slow-moving: a release happens every few days at best. Returning to the
    // foreground refetches once this goes stale — lib/query-client.ts wires
    // react-query's focus manager to AppState — so a release that lands while
    // the app is installed still gets noticed without any polling.
    staleTime: 30 * 60_000
  });

  // The dismissal lives outside React (features/app-update/dismissal.ts), so
  // changing it has to ask for the render that hides the card.
  const [, bumpRender] = useState(0);

  const release = releaseQ.data ?? null;
  const latest = release?.latest_version ?? null;
  const visible =
    release !== null &&
    updateAvailable(api.installedVersion(), latest) &&
    !isUpdateDismissed(latest);

  const dismiss = useCallback(() => {
    dismissUpdate(latest);
    bumpRender((n) => n + 1);
  }, [latest]);

  const openStore = useCallback(() => {
    if (!release) return;
    // The notice is left on screen on purpose: if the store did not open, the
    // one affordance for trying again should still be there.
    api.openStoreListing(release.store_url).catch(() => {
      notify('Could not open the store', 'Search for Choner in the store app to update.');
    });
  }, [release]);

  return { visible, release, dismiss, openStore };
}
