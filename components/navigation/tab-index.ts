// Which drawn tab is the active one, or null when the active route is not
// drawn in the bar at all.
//
// That second case is Profile: it is a registered tab, but it is reached from
// the top bar's avatar rather than from the bar, so the bar filters it out.
//
// This used to be `Math.max(0, findIndex(...))`, which turned "not in the bar"
// into "Home". Home then rendered as focused, and the `!focused` guard in the
// bar's onPress refused to navigate — so Home was the one tab that could not
// get you out of Profile (#124). Every other tab worked, which is why it read
// as "Home is broken" rather than "the highlight is wrong".
//
// Pure and in its own file so it can be tested without a renderer, the same
// way features/challenges/exercises.ts is.
export function activeTabIndex(
  visibleRouteIndexes: number[],
  stateIndex: number
): number | null {
  const found = visibleRouteIndexes.indexOf(stateIndex);
  return found === -1 ? null : found;
}
