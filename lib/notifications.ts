import { useEffect, useMemo, useState } from 'react';
import type * as NotificationsModule from 'expo-notifications';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import { router } from 'expo-router';

// Expo Go has shipped without push since SDK 53, and expo-notifications says so
// the moment it is imported: two warnings on every launch, and on Android the
// token lookup throws. So in Expo Go the module is never loaded and every entry
// point below is a no-op — the in-app notification centre still works, and a
// development or store build gets the real thing.
const Notifications: typeof NotificationsModule | null =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient
    ? null
    : (require('expo-notifications') as typeof NotificationsModule);

// Hooks can't be called conditionally, so pick the implementation once. With no
// module there is no launch response: null reads as "the OS answered: none".
const useLastNotificationResponse: () => NotificationsModule.NotificationResponse | null | undefined =
  Notifications?.useLastNotificationResponse ?? (() => null);

Notifications?.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true
  })
});

/**
 * Attach listeners that route the user when they tap a push notification.
 * The notification's data payload may carry `route` (e.g. `/post/123`).
 */
// Taps already routed, by notification id. A tap that LAUNCHES the app is
// seen by both paths below on some platforms, and must not navigate twice.
const handledTaps = new Set<string>();

function routeOf(response: NotificationsModule.NotificationResponse | null | undefined): string | null {
  if (!response) return null;
  const id = response.notification.request.identifier;
  if (handledTaps.has(id)) return null;
  const route = (response.notification.request.content.data as { route?: string } | null)?.route;
  if (!route || typeof route !== 'string') return null;
  handledTaps.add(id);
  return route;
}

/**
 * The route of the notification tap that launched the app from closed, if any.
 *
 * The listener below is only attached once a session exists, and the boot
 * splash then redirects to Home — so a tap that opened a killed app used to
 * land on Home, whatever it was about. app/index.tsx consumes this instead of
 * its default destination. `ready` is false until the OS has answered.
 */
export function useLaunchRoute(): { ready: boolean; route: string | null } {
  const last = useLastNotificationResponse();
  // Boot must never hang on this: web has no launch response, and a native
  // lookup that never answers only costs the deep link, never the app.
  const [gaveUp, setGaveUp] = useState(Platform.OS === 'web');
  useEffect(() => {
    if (gaveUp || last !== undefined) return;
    const t = setTimeout(() => setGaveUp(true), 1500);
    return () => clearTimeout(t);
  }, [gaveUp, last]);
  // Once per response, not per render: routeOf() records the tap as handled.
  const route = useMemo(() => (last === undefined ? null : routeOf(last)), [last]);
  if (last === undefined) return { ready: gaveUp, route: null };
  return { ready: true, route };
}

// The day-of relay (handover §7.2): when one person taps "I'm here", the
// other gets a push they can answer from the lock screen with one of three
// options. The action runs the answer; the tap itself still opens the plan.
export const RELAY_CATEGORY = 'plan_relay';
export const RELAY_ACTIONS = {
  here_too: "I'm here too",
  on_my_way: 'On my way',
  cant_make_it: "Won't be able to make it today"
} as const;

export async function registerNotificationCategories() {
  if (!Notifications) return;
  try {
    await Notifications.setNotificationCategoryAsync(
      RELAY_CATEGORY,
      (Object.keys(RELAY_ACTIONS) as (keyof typeof RELAY_ACTIONS)[]).map((id) => ({
        identifier: id,
        buttonTitle: RELAY_ACTIONS[id],
        options: { opensAppToForeground: true }
      }))
    );
  } catch {
    // Web and older clients have no categories; the in-app sheet covers them.
  }
}

// Set by the app provider: answers a relay action (needs the RPC client,
// which this module deliberately doesn't import).
let relayHandler: ((planId: string, choice: keyof typeof RELAY_ACTIONS) => Promise<void>) | null = null;
export function registerRelayHandler(fn: typeof relayHandler) {
  relayHandler = fn;
}

export function attachNotificationResponseListener() {
  if (!Notifications) return () => {};
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    const action = response.actionIdentifier as keyof typeof RELAY_ACTIONS;
    const planId = (response.notification.request.content.data as { planId?: string } | null)?.planId;
    if (planId && action in RELAY_ACTIONS && relayHandler) {
      relayHandler(planId, action).catch(() => {});
    }
    const route = routeOf(response);
    if (route) {
      try {
        router.push(route as never);
      } catch {
        // ignore — route may not be valid in the current navigator state
      }
    }
  });
  return () => sub.remove();
}

export async function registerForPushNotificationsAsync() {
  if (!Notifications) return null;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const permission = await Notifications.requestPermissionsAsync();
    finalStatus = permission.status;
  }

  if (finalStatus !== 'granted') return null;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  return token.data;
}
