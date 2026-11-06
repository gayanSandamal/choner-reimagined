import { Alert, Platform } from 'react-native';

// Cross-platform user feedback.
//
// react-native-web ships Alert as a literal no-op:
//
//   class Alert { static alert() {} }
//
// So every Alert.alert in the app was silent on the web build — a failed sign
// in, a refused invite, a check-in that didn't save, all of it vanished. On
// native the same calls worked fine, which is why it survived this long.
//
// Native keeps the real system dialog. Web routes through the in-app toast
// that already exists for push-style banners, falling back to window.alert if
// a message somehow fires before the provider has mounted — a clumsy dialog
// beats losing the message entirely.

// ---------------------------------------------------------------------------
// One system dialog at a time.
//
// iOS presents a single view controller at a time. An alert raised while
// another alert, an RN <Modal>, or a share sheet is still animating is dropped
// by UIKit, and can leave a presented-but-empty window above the app: the
// screen still renders and no longer accepts a touch, which reads as a freeze
// with no error anywhere. The promise below never settles either, because
// neither onPress ever fires, so whatever asked the question hangs with it.
//
// Three call sites already work around one case with a 300ms sleep before
// confirmAction, each with a comment saying why: FeedSafetyMenu,
// PairSafetyMenu and app/challenge/[id].tsx. Ten others do not, and
// handleDeleteAccount in app/settings/index.tsx raises two alerts back to back
// with no gap at all — the second presented from inside the first's onPress.
// Queueing here covers every call site, including ones added later.
//
// Android has no presentation conflict, but queueing there costs nothing and
// keeps one code path to reason about.
const SETTLE_MS = 350;
// A dialog that is never answered must not wedge the queue for the rest of the
// session, so every wait has a ceiling. Long enough that a real person reading
// a destructive warning is never cut off.
const WATCHDOG_MS = 30_000;

let chain: Promise<unknown> = Promise.resolve();

const settle = () => new Promise((resolve) => setTimeout(resolve, SETTLE_MS));

function present<T>(run: () => Promise<T>): Promise<T> {
  // Both handlers, so one rejection cannot stop the queue forever.
  const next = chain.then(run, run);
  chain = next.then(settle, settle);
  return next;
}

// Identical alerts already queued are dropped rather than shown twice.
//
// Before queueing, a burst of notify() calls on iOS collapsed to one dialog
// because UIKit discarded the rest. Now they would all appear in turn, so a
// path that reports the same failure twice would make the user dismiss it
// twice — worse than what it replaces. Different messages still queue.
const queuedKeys = new Set<string>();

type ToastFn = (t: { title: string; body?: string | null }) => void;

let toastHandler: ToastFn | null = null;

// Called by ToastProvider on mount. Module-level rather than a hook because
// most callers are plain async functions, not components.
export function registerToastHandler(fn: ToastFn | null) {
  toastHandler = fn;
}

export function notify(title: string, message?: string) {
  if (Platform.OS !== 'web') {
    const key = `${title}\u0000${message ?? ''}`;
    if (queuedKeys.has(key)) return;
    queuedKeys.add(key);

    void present(
      () =>
        new Promise<void>((resolve) => {
          let closed = false;
          let watchdog: ReturnType<typeof setTimeout>;
          const done = () => {
            if (closed) return;
            closed = true;
            clearTimeout(watchdog);
            queuedKeys.delete(key);
            resolve();
          };
          watchdog = setTimeout(done, WATCHDOG_MS);
          // An explicit button, where this used to pass none. iOS draws the
          // same single "OK" either way, but a default button reports no
          // press, so the queue would have had nothing to wait on.
          Alert.alert(title, message, [{ text: 'OK', onPress: done }], {
            // Android dismisses on back or an outside tap, firing no onPress.
            cancelable: true,
            onDismiss: done
          });
        })
    );
    return;
  }
  if (toastHandler) {
    toastHandler({ title, body: message ?? null });
    return;
  }
  if (typeof window !== 'undefined' && typeof window.alert === 'function') {
    window.alert(message ? `${title}\n\n${message}` : title);
  }
}

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

let confirmHandler: ConfirmFn | null = null;

// Called by ConfirmProvider on mount, mirroring registerToastHandler.
export function registerConfirmHandler(fn: ConfirmFn | null) {
  confirmHandler = fn;
}

// A real yes/no. Resolves false on cancel, so callers can
// `if (!(await confirmAction(...))) return;`
//
// Web goes through the in-app dialog rather than window.confirm. The original
// note here said a custom modal was "only worth building if these become
// common" — there are ten call sites now, and window.confirm turned out to be
// worse than clumsy: embedded webviews and sandboxed iframes SUPPRESS it,
// returning false instantly with no dialog shown. Every confirm on web was
// therefore silently answering "no" — sign out, delete account and ending a
// challenge all looked like dead buttons.
export async function confirmAction(options: ConfirmOptions): Promise<boolean> {
  const { title, message, confirmLabel = 'OK', cancelLabel = 'Cancel', destructive } = options;

  if (Platform.OS !== 'web') {
    return present(
      () =>
        new Promise<boolean>((resolve) => {
          let settled = false;
          let watchdog: ReturnType<typeof setTimeout>;
          const answer = (value: boolean) => {
            if (settled) return;
            settled = true;
            clearTimeout(watchdog);
            resolve(value);
          };
          // If the dialog is dropped despite the queue, fail closed. Every
          // caller here guards something destructive, and a question nobody
          // saw must never come back as a yes.
          watchdog = setTimeout(() => answer(false), WATCHDOG_MS);
          Alert.alert(
            title,
            message,
            [
              { text: cancelLabel, style: 'cancel', onPress: () => answer(false) },
              {
                text: confirmLabel,
                style: destructive ? 'destructive' : 'default',
                onPress: () => answer(true)
              }
            ],
            // Android's back button and outside tap close the dialog without
            // pressing anything; that is a cancel, not a hang.
            { cancelable: true, onDismiss: () => answer(false) }
          );
        })
    );
  }

  if (confirmHandler) return confirmHandler(options);

  // Only before the provider has mounted. Kept because a suppressed dialog
  // that answers "no" is still the safe failure for a destructive action.
  if (typeof window === 'undefined' || typeof window.confirm !== 'function') return false;
  return window.confirm(message ? `${title}\n\n${message}` : title);
}
