import { useEffect, useMemo, useState } from 'react';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { router } from 'expo-router';

Notifications.setNotificationHandler({
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

function routeOf(response: Notifications.NotificationResponse | null | undefined): string | null {
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
  const last = Notifications.useLastNotificationResponse();
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

export function attachNotificationResponseListener() {
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
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
