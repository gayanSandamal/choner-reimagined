import { dismissUpdate, isUpdateDismissed, resetUpdateDismissal } from './dismissal';

// How long "Dismiss" lasts is the one thing about this feature that was asked
// for by name: off the screen now, back on the next app open. It is a rule
// about process lifetime, which is exactly the kind of thing that gets
// "optimised" into AsyncStorage by someone trying to be helpful — so it is
// pinned here rather than left as a comment.

beforeEach(() => resetUpdateDismissal());

describe('update dismissal', () => {
  it('nothing is dismissed to begin with', () => {
    expect(isUpdateDismissed('0.3.0')).toBe(false);
  });

  it('hides the version that was dismissed', () => {
    dismissUpdate('0.3.0');
    expect(isUpdateDismissed('0.3.0')).toBe(true);
  });

  it('does not swallow the version after it', () => {
    dismissUpdate('0.3.0');
    // A release that lands while the app is still running still gets to ask.
    expect(isUpdateDismissed('0.4.0')).toBe(false);
  });

  it('comes back on the next app open', () => {
    dismissUpdate('0.3.0');
    // resetUpdateDismissal() stands in for the only thing that clears this in
    // production: the process ending. Nothing writes it to disk, so there is
    // nothing else that could survive.
    resetUpdateDismissal();
    expect(isUpdateDismissed('0.3.0')).toBe(false);
  });

  it('a version that cannot be named is never dismissed', () => {
    // dismiss() is called with whatever the row had, which can be null if the
    // row vanished between render and tap. Null must not match null and hide
    // every future notice.
    dismissUpdate(null);
    expect(isUpdateDismissed(null)).toBe(false);
  });
});
