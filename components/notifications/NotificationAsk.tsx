import { useEffect, useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/Icon';
import { registerPushToken } from '@/features/notifications/api';
import { getPushStatus, registerForPushNotificationsAsync } from '@/lib/notifications';
import { theme } from '@/constants/theme';

// Notifications are asked for here, in context, and nowhere else.
//
// The app used to show the system prompt straight after sign-in, before
// anyone knew why it wanted to notify them. App Review expects a permission to
// be asked when it is needed, with the reason on screen first (5.1.1), and the
// button must not tell people how to answer: "Continue", never "Allow".
//
// It appears once there is a partner or a match, which is the first moment a
// notification means something: they checked in, they sent a plan, a match is
// waiting. "Not now" is respected for a week.

const KEY = 'notification_ask_dismissed_at';
const WEEK = 7 * 24 * 3600 * 1000;

export function NotificationAsk({
  when,
  userId,
  partnerName
}: {
  // True once the moment has come: a partner, or a match waiting.
  when: boolean;
  userId: string | undefined;
  partnerName: string | null;
}) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!when || !userId) return;
    let cancelled = false;
    (async () => {
      if ((await getPushStatus()) !== 'undetermined') return;
      try {
        const at = Number((await AsyncStorage.getItem(KEY)) ?? 0);
        if (at && Date.now() - at < WEEK) return;
      } catch {
        // No storage: ask anyway, once this session.
      }
      if (!cancelled) setOpen(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [when, userId]);

  const later = async () => {
    setOpen(false);
    try {
      await AsyncStorage.setItem(KEY, String(Date.now()));
    } catch {
      // best effort
    }
  };

  const onContinue = async () => {
    setBusy(true);
    try {
      const token = await registerForPushNotificationsAsync({ ask: true });
      if (token && userId) await registerPushToken({ userId, token });
    } catch {
      // Push is not required to use the app.
    } finally {
      setBusy(false);
      setOpen(false);
    }
  };

  const who = partnerName ?? 'your partner';
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={later}>
      <View style={styles.scrim}>
        <View style={[styles.sheet, { paddingBottom: 20 + insets.bottom }]}>
          <View style={styles.icon}>
            <Icon name="bell" size={26} color={theme.colors.primary2} />
          </View>
          <AppText style={styles.title}>Know when {who} shows up</AppText>
          <AppText style={styles.body}>
            Choner sends a notification when {who} checks in, suggests a plan, or a match is waiting for
            your answer. Nothing else.
          </AppText>
          <Button label="Continue" loading={busy} onPress={onContinue} />
          <Button label="Not now" variant="ghost" disabled={busy} onPress={later} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(0,24,39,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingTop: 26,
    paddingHorizontal: 22,
    gap: 10
  },
  icon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(253,131,2,0.12)',
    marginBottom: 4
  },
  title: { fontSize: 20, lineHeight: 26, color: theme.colors.text, textAlign: 'center', fontFamily: theme.fonts.bodyBold },
  body: { fontSize: 13.5, lineHeight: 20, color: theme.colors.muted, textAlign: 'center', marginBottom: 8 }
});
