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

type ToastFn = (t: { title: string; body?: string | null }) => void;

let toastHandler: ToastFn | null = null;

// Called by ToastProvider on mount. Module-level rather than a hook because
// most callers are plain async functions, not components.
export function registerToastHandler(fn: ToastFn | null) {
  toastHandler = fn;
}

export function notify(title: string, message?: string) {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message);
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
    return new Promise<boolean>((resolve) => {
      Alert.alert(title, message, [
        { text: cancelLabel, style: 'cancel', onPress: () => resolve(false) },
        {
          text: confirmLabel,
          style: destructive ? 'destructive' : 'default',
          onPress: () => resolve(true)
        }
      ]);
    });
  }

  if (confirmHandler) return confirmHandler(options);

  // Only before the provider has mounted. Kept because a suppressed dialog
  // that answers "no" is still the safe failure for a destructive action.
  if (typeof window === 'undefined' || typeof window.confirm !== 'function') return false;
  return window.confirm(message ? `${title}\n\n${message}` : title);
}
