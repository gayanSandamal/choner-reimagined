import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/Icon';
import { useUpdateNotice } from '@/features/app-update/hooks';
import { theme } from '@/constants/theme';

// "There's a new version" — offered, never forced.
//
// It renders nothing at all unless public.app_releases says the store has a
// newer version than this build (features/app-update/hooks.ts decides), so it
// costs one cached query and no screen space the rest of the time.
//
// Dismiss closes it for this app run only, and says so in as many words. The
// alternative — remembering the dismissal — would quietly mean "never ask me
// again", which is not what a person taps when they are busy.
export function UpdateNotice() {
  const { visible, release, dismiss, openStore } = useUpdateNotice();

  if (!visible || !release) return null;

  return (
    <Animated.View entering={FadeInDown.duration(300)} style={styles.card}>
      <View style={styles.titleRow}>
        <View style={styles.mark}>
          <Icon name="redo" size={18} color={theme.colors.primary2} />
        </View>
        <View style={styles.titleText}>
          <AppText style={styles.title}>Update available</AppText>
          <AppText style={styles.version}>Version {release.latest_version}</AppText>
        </View>
      </View>

      <AppText style={styles.line}>
        {release.notes?.trim()
          ? release.notes.trim()
          : "A newer version of Choner is in the store. Updating takes a moment, and your streak comes with you."}
      </AppText>

      <View style={styles.actions}>
        {/* Button's props are a closed interface — no accessibility overrides.
            Both labels read correctly as they are, so there is nothing to
            override. */}
        <Button label="Update now" size="sm" style={styles.grow} onPress={openStore} />
        <Button label="Dismiss" variant="ghost" size="sm" onPress={dismiss} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 22,
    padding: 18,
    gap: 12,
    ...theme.shadow.md
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  mark: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(253,131,2,0.08)'
  },
  titleText: { flex: 1, gap: 2 },
  title: {
    fontSize: 16,
    lineHeight: 21,
    letterSpacing: -0.2,
    color: theme.colors.text,
    fontFamily: theme.fonts.bodyMedium
  },
  version: { fontSize: 12, lineHeight: 17, color: theme.colors.muted },
  line: { fontSize: 13, lineHeight: 19.5, color: theme.colors.muted },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  grow: { flex: 1 }
});
