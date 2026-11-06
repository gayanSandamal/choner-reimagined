import { compareVersions, updateAvailable, versionSegments } from './version';

// The whole update notice hangs off this comparison, and it is shown to
// everybody at once. Two failure modes matter and they are not symmetric:
// missing a release is a shrug, while nagging people to install a version that
// does not exist is the kind of thing that gets screenshotted.

describe('versionSegments', () => {
  it('reads plain dotted numbers', () => {
    expect(versionSegments('0.2.0')).toEqual([0, 2, 0]);
    expect(versionSegments('1')).toEqual([1]);
    expect(versionSegments(' 1.20.300 ')).toEqual([1, 20, 300]);
  });

  it('refuses anything it would have to guess at', () => {
    for (const bad of ['', '   ', 'v1.2.0', '1.2.0-beta', '1..2', '1.2.x', 'latest', null, undefined, 2 as never]) {
      expect(versionSegments(bad as string)).toBeNull();
    }
  });

  it('does not mind surrounding whitespace, which a pasted row collects', () => {
    expect(versionSegments(' 0.2.1\n')).toEqual([0, 2, 1]);
  });
});

describe('compareVersions', () => {
  it('compares segments as numbers, not as text', () => {
    // The one string comparison gets backwards, and the reason this exists.
    expect(compareVersions('0.9.0', '0.10.0')).toBe(-1);
    expect(compareVersions('0.10.0', '0.9.0')).toBe(1);
  });

  it('treats a missing segment as zero', () => {
    expect(compareVersions('1.2', '1.2.0')).toBe(0);
    expect(compareVersions('1.2.0', '1.2')).toBe(0);
    expect(compareVersions('1.2', '1.2.1')).toBe(-1);
  });

  it('says nothing when either side is unreadable', () => {
    expect(compareVersions('1.2.0', 'soon')).toBeNull();
    expect(compareVersions(undefined, '1.2.0')).toBeNull();
  });
});

describe('updateAvailable', () => {
  it('is true only when the store is strictly newer', () => {
    expect(updateAvailable('0.2.0', '0.2.1')).toBe(true);
    expect(updateAvailable('0.2.0', '1.0.0')).toBe(true);
  });

  it('is false for the version already installed', () => {
    // The normal state of the world, and the state 202611061000 seeds.
    expect(updateAvailable('0.2.0', '0.2.0')).toBe(false);
  });

  it('is false when the store somehow reports older', () => {
    // A row edited by hand, or a build shipped ahead of the row. Either way
    // it is a mistake somewhere, not a reason to send anyone to a listing.
    expect(updateAvailable('0.3.0', '0.2.0')).toBe(false);
  });

  it('is false rather than loud when a version cannot be read', () => {
    expect(updateAvailable('0.2.0', '')).toBe(false);
    expect(updateAvailable(null, '9.9.9')).toBe(false);
    expect(updateAvailable('0.2.0', 'v0.3.0')).toBe(false);
  });
});
