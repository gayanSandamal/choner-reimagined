import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/button';
import { PressableScale } from '@/components/ui/PressableScale';
import { Icon, IconName } from '@/components/ui/Icon';
import type { HomeHero } from '@/features/home/hero';
import { theme } from '@/constants/theme';

// The hero: the current commitment and the single next action. At most one
// button. While searching there is none: the "Searching" row is the control,
// and all it does is open Find, where stopping the search lives.
//
// Styled as the prototype's .hero: orange eyebrow, the activity's icon beside
// its name, no border, the soft card shadow.
export function HomeHeroCard({
  hero,
  icon,
  busy,
  onAction,
  onOpenFind
}: {
  hero: HomeHero;
  // The activity's icon, shown beside the title when the title is the activity.
  icon?: IconName | null;
  busy: boolean;
  onAction: () => void;
  onOpenFind: () => void;
}) {
  return (
    <View style={styles.card}>
      {hero.eyebrow ? <AppText style={styles.eyebrow}>{hero.eyebrow.toUpperCase()}</AppText> : null}
      <View style={styles.titleRow}>
        {icon ? <Icon name={icon} size={24} color={theme.colors.primary2} /> : null}
        <AppText style={styles.title}>{hero.title}</AppText>
      </View>

      {hero.searching ? (
        <PressableScale
          onPress={onOpenFind}
          haptic="selection"
          accessibilityRole="button"
          accessibilityLabel="Searching. See your search."
          style={styles.searching}
        >
          <View style={styles.dots}>
            <View style={styles.dot} />
            <View style={[styles.dot, styles.dotMid]} />
            <View style={[styles.dot, styles.dotLow]} />
          </View>
          <AppText style={styles.searchingText}>Searching</AppText>
          <Ionicons name="chevron-forward" size={16} color={theme.colors.primary2} />
        </PressableScale>
      ) : null}

      {hero.line ? <AppText style={styles.line}>{hero.line}</AppText> : null}
      {hero.action ? <Button label={hero.action.label} loading={busy} onPress={onAction} /> : null}
    </View>
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
  eyebrow: { fontSize: 11, letterSpacing: 0.9, color: theme.colors.primary2, fontFamily: theme.fonts.bodyBold },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { flex: 1, fontSize: 20, lineHeight: 25, letterSpacing: -0.3, color: theme.colors.text, fontFamily: theme.fonts.bodyMedium },
  line: { fontSize: 13, lineHeight: 19.5, color: theme.colors.muted },
  searching: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(253,131,2,0.08)',
    borderRadius: theme.radius.md,
    paddingVertical: 12,
    paddingHorizontal: 14
  },
  dots: { flexDirection: 'row', gap: 4 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.colors.primary },
  dotMid: { opacity: 0.6 },
  dotLow: { opacity: 0.3 },
  searchingText: { flex: 1, fontSize: 14, color: theme.colors.primary2, fontFamily: theme.fonts.bodyMedium }
});
