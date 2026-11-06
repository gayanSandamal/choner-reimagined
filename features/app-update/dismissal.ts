/* "Not now" — remembered for exactly as long as the app is running.
 *
 * DELIBERATELY NOT PERSISTED, and that is the whole rule this file exists to
 * hold. A flag in AsyncStorage would turn one tap on a busy morning into
 * "never ask me again", silently and permanently, for the person most likely
 * to be running an old build. Module state dies with the process, so the next
 * cold start asks once more.
 *
 * Worth being precise about "next app open": the JS context survives
 * backgrounding, so this survives it too. Re-opening from the app switcher
 * keeps the notice dismissed; a cold start brings it back. If it should
 * instead return after some time away, this is where that goes — an AppState
 * listener calling resetUpdateDismissal() past some threshold — and nothing
 * else has to change.
 *
 * Kept out of the hook so the rule can be tested as a rule, and so there is
 * one obvious place to look when somebody asks how long a dismissal lasts.
 */

let dismissedVersion: string | null = null;

/** Remember that this exact version was waved away. */
export function dismissUpdate(version: string | null) {
  dismissedVersion = version;
}

/**
 * Versioned rather than a boolean: dismissing 0.3.0 should not also swallow
 * 0.4.0 if it lands while the app is still running.
 */
export function isUpdateDismissed(version: string | null): boolean {
  return version !== null && dismissedVersion === version;
}

/** A cold start, or a test that needs one. */
export function resetUpdateDismissal() {
  dismissedVersion = null;
}
