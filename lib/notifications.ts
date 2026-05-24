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
export function attachNotificationResponseListener() {
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    const route = (response.notification.request.content.data as { route?: string } | null)?.route;
    if (route && typeof route === 'string') {
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
