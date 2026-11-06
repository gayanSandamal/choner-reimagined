import { act, fireEvent, screen } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import VerifyEmailScreen from '@/app/(auth)/verify-email';
import * as auth from '@/features/auth/api';
import { renderWithProviders } from '@/test/render';

// #160, on its third attempt. What this pins is the ORDER, because the bug
// was never which screen the button named.
//
// checkVerified() is not a read. It is signInWithPassword, so a poll that
// lands on a confirmed address signs the person in. If one is already in the
// air when "Back to sign in" is tapped, and the screen signs out and
// navigates without waiting for it, the probe lands a moment later and signs
// them straight back in. The root gate then sees a signed-in account with
// onboarding outstanding sitting on an auth screen and replaces sign-in with
// /onboarding. That is what the report describes, and the
// ROUTE_NAMES_CHANGED warning naming the onboarding routes was that second
// navigation mounting.
//
// The first fix set a done flag and signed out before navigating. Neither
// touches a request that has already left, which is why it did not hold.
//
// ONE test, deliberately. This screen does not survive being rendered twice
// in a jest file: the second render never mounts, so its effects never run
// and nothing is on screen to press. Three more cases were written and all
// three passed on their own and failed in company. Finding out why was not
// worth more of the clock while the fix itself was waiting, and the race
// below is the thing that has now broken twice. Further cases belong in
// their own file until that is understood.
//
// Driven through the AppState listener rather than the six second interval,
// with no fake timers anywhere. Faking them before the render stops React's
// scheduler committing at all, and turning them on afterwards is too late for
// an interval that already exists. Coming back from the mail app is a real
// path into the same look().

jest.mock('@/features/auth/api', () => ({
  checkVerified: jest.fn(),
  resendVerification: jest.fn(async () => undefined),
  signOut: jest.fn(async () => undefined),
  forgetPendingPassword: jest.fn()
}));

const EMAIL = 'dinesh@example.com';

type Probe = 'verified' | 'waiting' | 'unknown';

function deferred() {
  let resolve!: (v: Probe) => void;
  const promise = new Promise<Probe>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

const flush = () =>
  act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });

// Replaced rather than spied on, because the effect's cleanup calls
// sub.remove() and a listener handing back undefined throws on unmount.
let onAppState: ((s: string) => void) | null = null;

beforeEach(() => {
  jest.clearAllMocks();
  onAppState = null;
  jest.spyOn(AppState, 'addEventListener').mockImplementation(((
    _event: string,
    handler: (s: string) => void
  ) => {
    onAppState = handler;
    return { remove: jest.fn() };
  }) as unknown as typeof AppState.addEventListener);
  (useLocalSearchParams as jest.Mock).mockReturnValue({ email: EMAIL });
});

it('waits for a probe already in the air before signing out, so the exit keeps its destination (#160)', async () => {
  const probe = deferred();
  (auth.checkVerified as jest.Mock).mockReturnValue(probe.promise);

  const view = await renderWithProviders(<VerifyEmailScreen />);

  // The app returning to the foreground starts a probe. It has not landed.
  expect(typeof onAppState).toBe('function');
  await act(async () => {
    onAppState?.('active');
  });
  await flush();
  expect(auth.checkVerified).toHaveBeenCalledTimes(1);

  fireEvent.press(screen.getByText('Back to sign in'));
  await flush();

  // THE POINT. Nothing has signed out yet, because signing out now would be
  // undone by the probe landing a moment later.
  expect(auth.signOut).not.toHaveBeenCalled();

  // It lands, confirmed, which has just created a session.
  await act(async () => {
    probe.resolve('verified');
  });
  await flush();

  // Signed out after it landed, so the session it made is gone...
  expect(auth.signOut).toHaveBeenCalled();
  // ...and the destination is the one the button named.
  expect(router.replace).toHaveBeenCalledWith('/(auth)/sign-in');
  expect(router.replace).not.toHaveBeenCalledWith('/onboarding');

  view.unmount();
});
