import { activeTabIndex } from './tab-index';

// The bar draws four of the five registered tabs. Profile is the fifth: it is
// reached from the top bar's avatar, not the bar. Routes are
// [home, challenges, find, community, profile], so the drawn ones are route
// indexes 0..3 and Profile is 4.
const DRAWN = [0, 1, 2, 3];

describe('activeTabIndex', () => {
  it('finds the active tab when it is one the bar draws', () => {
    expect(activeTabIndex(DRAWN, 0)).toBe(0);
    expect(activeTabIndex(DRAWN, 2)).toBe(2);
  });

  // #124. Math.max(0, -1) turned "not in the bar" into "Home", so Home drew as
  // focused while Profile was open and the !focused guard then refused to
  // navigate away from it.
  it('returns null when the active route is not drawn in the bar', () => {
    expect(activeTabIndex(DRAWN, 4)).toBeNull();
  });

  it('never silently reports Home for a route it cannot find', () => {
    expect(activeTabIndex(DRAWN, 99)).not.toBe(0);
    expect(activeTabIndex([], 0)).toBeNull();
  });

  // The bar keeps each route's ORIGINAL index after filtering, so a gap in the
  // list must still map to the right position rather than to its own value.
  it('maps through a filtered list rather than using the raw index', () => {
    expect(activeTabIndex([0, 1, 3, 4], 3)).toBe(2);
    expect(activeTabIndex([0, 1, 3, 4], 2)).toBeNull();
  });
});
