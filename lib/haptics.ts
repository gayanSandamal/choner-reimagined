import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// Module-level switch lets callers (e.g. settings screen) silence haptics globally.
let enabled = true;

export function setHapticsEnabled(value: boolean) {
  enabled = value;
}

export function hapticsEnabled() {
  return enabled;
}

function fire(fn: () => Promise<void>) {
  if (!enabled) return;
  // Haptics are iOS/Android only; expo-haptics no-ops on web but still let's guard.
  if (Platform.OS === 'web') return;
  fn().catch(() => undefined);
}

export const haptics = {
  tap: () => fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  press: () => fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  bold: () => fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)),
  selection: () => fire(() => Haptics.selectionAsync()),
  success: () => fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  error: () => fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error))
};
