import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { Icon, IconName } from '@/components/ui/Icon';
import { PressableScale } from '@/components/ui/PressableScale';
import { HomePulse, pulseHeadline, pulseMoments } from '@/features/home/hero';
import { theme } from '@/constants/theme';

const ACTIVITY_ICONS: Record<string, IconName> = {
  running: 'run',
  jogging: 'run',
  walking: 'walk',
  cycling: 'bike',
  yoga: 'leaf',
  home_workouts: 'dumb'
};

// Choner Pulse: who else is here, by activity. Every number is a real count
// from get_home_pulse(); an activity with nobody on it is not drawn, and with
// nobody at all the card is not drawn either.
//
// The tiles open Find's directory. That is the one thing on Home that leaves
// for another tab's screen, and it is browsing, not starting a search.
export function PulseCard({ pulse, onOpenDirectory }: { pulse: HomePulse; onOpenDirectory: () => void }) {
  const headline = pulseHeadline(pulse);
  const tiles = pulse.by_activity.filter((a) => a.people > 0);
  if (!headline || tiles.length === 0) return null;

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={styles.live} />
        <AppText style={styles.heading}>Choner Pulse</AppText>
      </View>
      <AppText style={styles.headline}>{headline}</AppText>
      <View style={styles.tiles}>
        {tiles.map((a) => (
          <PressableScale
            key={a.activity_key}
            onPress={onOpenDirectory}
            haptic="selection"
            accessibilityRole="button"
            accessibilityLabel={`${a.title}, ${a.people} people. See who is on the move.`}
            style={styles.tile}
          >
            <Icon name={ACTIVITY_ICONS[a.activity_key] ?? 'target'} size={18} color={theme.colors.primary2} />
            <AppText style={styles.tileCount}>{a.people}</AppText>
            <AppText style={styles.tileLabel}>{a.title}</AppText>
          </PressableScale>
        ))}
      </View>
    </View>
  );
}

// Just Happened: a dark card that changes by itself and is not tappable. It
// rotates through what has actually happened; with nothing to say it is absent.
export function JustHappened({ pulse }: { pulse: HomePulse }) {
  const moments = pulseMoments(pulse);
  const [i, setI] = useState(0);

  useEffect(() => {
    if (moments.length < 2) return;
    const t = setInterval(() => setI((n) => (n + 1) % moments.length), 4000);
    return () => clearInterval(t);
  }, [moments.length]);

  if (moments.length === 0) return null;
  const line = moments[i % moments.length];
  return (
    <View style={styles.dark} accessible accessibilityLabel={`Just happened. ${line}`}>
      <AppText style={styles.darkEyebrow}>JUST HAPPENED</AppText>
      <AppText style={styles.darkLine}>{line}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 18,
    gap: 10
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  live: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.success },
  heading: { fontSize: 13, color: theme.colors.text, fontFamily: theme.fonts.bodyMedium },
  headline: { fontSize: 15, color: theme.colors.text },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: {
    flexBasis: '31%',
    flexGrow: 1,
    backgroundColor: theme.colors.surface3,
    borderRadius: theme.radius.md,
    paddingVertical: 12,
    paddingHorizontal: 10,
    gap: 2
  },
  tileCount: { fontSize: 18, color: theme.colors.text, fontFamily: theme.fonts.bodyBold },
  tileLabel: { fontSize: 11.5, color: theme.colors.muted },
  dark: {
    backgroundColor: '#001827',
    borderRadius: 20,
    padding: 20,
    minHeight: 110,
    justifyContent: 'center',
    gap: 8
  },
  darkEyebrow: { fontSize: 10, letterSpacing: 1.2, color: 'rgba(255,255,255,0.55)' },
  darkLine: { fontSize: 18, lineHeight: 25, color: '#FFFFFF' }
});
