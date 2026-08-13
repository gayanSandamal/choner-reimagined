import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppText } from '@/components/ui/AppText';
import { PressableScale } from '@/components/ui/PressableScale';
import { theme } from '@/constants/theme';

type GlyphName = keyof typeof Ionicons.glyphMap;

// One-off accent hex not in the shared palette — same precedent as
// Avatar.tsx's PALETTES, kept local since only this screen uses it.
const VIOLET = '#7C5CFF';
const VIOLET_SOFT = '#B8A6FF';

const CATEGORY_VISUALS: Record<string, { icon: GlyphName; color: string }> = {
  movement: { icon: 'walk-outline', color: theme.colors.link },
  sleep: { icon: 'moon-outline', color: VIOLET_SOFT },
  stress: { icon: 'leaf-outline', color: theme.colors.success },
  energy: { icon: 'flash-outline', color: theme.colors.primary2 }
};

function categoryVisual(category: string) {
  return CATEGORY_VISUALS[category?.toLowerCase()] ?? { icon: 'flame-outline' as GlyphName, color: theme.colors.muted };
}

const DIFFICULTY_PIPS: Record<string, number> = {
  beginner: 1,
  intermediate: 2,
  advanced: 3
};

function difficultyPips(difficulty: string) {
  return DIFFICULTY_PIPS[difficulty?.toLowerCase()] ?? 1;
}

export type FireState = {
  mode: 'solo' | 'partner';
  status: string;
  streak: number;
};

interface Props {
  title: string;
  description?: string;
  category: string;
  durationDays: number;
  difficulty: string;
  locked?: boolean;
  fireState?: FireState;
  onPress: () => void;
  delay?: number;
}

function ribbonLabel(fireState: FireState) {
  if (fireState.mode === 'partner' && fireState.status === 'pending') {
    return 'Your partner fire · waiting';
  }
  const who = fireState.mode === 'solo' ? 'solo' : 'partner';
  return fireState.streak > 0 ? `Your ${who} fire · day ${fireState.streak}` : `Your ${who} fire`;
}

export function QuestCard({
  title,
  description,
  category,
  durationDays,
  difficulty,
  locked = false,
  fireState,
  onPress,
  delay = 0
}: Props) {
  const visual = categoryVisual(category);
  const pips = difficultyPips(difficulty);
  const lit = Boolean(fireState);

  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(280)}>
      <PressableScale
        onPress={onPress}
        scaleTo="subtle"
        haptic="light"
        style={[
          styles.card,
          lit ? styles.cardLit : locked ? styles.cardLocked : styles.cardDefault
        ]}
      >
        {lit ? (
          <View style={styles.ribbon}>
            <Ionicons name="flame" size={12} color={theme.colors.secondary} />
            <AppText variant="caption" style={styles.ribbonText}>
              {ribbonLabel(fireState!)}
            </AppText>
          </View>
        ) : null}

        <View style={styles.row}>
          <View style={[styles.iconBadge, { backgroundColor: `${visual.color}29` }]}>
            <Ionicons name={visual.icon} size={20} color={visual.color} />
          </View>

          <View style={{ flex: 1 }}>
            <View style={styles.titleRow}>
              <AppText variant="subtitle" style={{ flex: 1 }}>
                {title}
              </AppText>
              {locked ? (
                <View style={styles.proBadge}>
                  <Ionicons name="lock-closed-outline" size={10} color="#FFFFFF" />
                  <AppText style={styles.proBadgeText}>Pro</AppText>
                </View>
              ) : null}
            </View>

            {description ? (
              <AppText variant="caption" muted numberOfLines={2} style={{ marginTop: 4, marginBottom: 10 }}>
                {description}
              </AppText>
            ) : null}

            <View style={styles.metaRow}>
              <View style={styles.metaLeft}>
                <AppText variant="caption" muted>
                  {durationDays} days ·{' '}
                </AppText>
                {[0, 1, 2].map((i) => (
                  <Ionicons
                    key={i}
                    name="flame"
                    size={11}
                    color={i < pips ? theme.colors.primary : theme.colors.surface3}
                    style={{ marginRight: 1 }}
                  />
                ))}
                <AppText variant="caption" muted style={{ marginLeft: 4 }}>
                  {difficulty}
                </AppText>
              </View>

              <View
                style={[
                  styles.cta,
                  locked ? styles.ctaLocked : lit ? styles.ctaLit : styles.ctaDefault
                ]}
              >
                <AppText
                  variant="caption"
                  style={{
                    fontFamily: theme.fonts.bodyBold,
                    color: locked ? VIOLET_SOFT : lit ? theme.colors.bg : theme.colors.text
                  }}
                >
                  {locked ? 'Unlock' : lit ? 'Continue' : 'Start'}
                </AppText>
                <Ionicons
                  name={locked ? 'lock-closed-outline' : 'arrow-forward'}
                  size={12}
                  color={locked ? VIOLET_SOFT : lit ? theme.colors.bg : theme.colors.text}
                />
              </View>
            </View>
          </View>
        </View>
      </PressableScale>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    padding: theme.spacing(1.75),
    gap: theme.spacing(1)
  },
  cardDefault: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border
  },
  cardLit: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.primary,
    ...theme.shadow.glow
  },
  cardLocked: {
    backgroundColor: theme.colors.surface,
    borderColor: 'rgba(124,92,255,0.4)'
  },
  ribbon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,138,31,0.16)',
    borderRadius: theme.radius.pill,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3
  },
  ribbonText: { color: theme.colors.secondary, fontFamily: theme.fonts.bodyBold, fontSize: 11 },
  row: { flexDirection: 'row', gap: theme.spacing(1.5) },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.sm,
    alignItems: 'center',
    justifyContent: 'center'
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: VIOLET,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2
  },
  proBadgeText: { color: '#FFFFFF', fontFamily: theme.fonts.bodyBold, fontSize: 10 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  metaLeft: { flexDirection: 'row', alignItems: 'center', flexShrink: 1 },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  ctaDefault: {
    backgroundColor: theme.colors.chip,
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  ctaLit: { backgroundColor: theme.colors.primary },
  ctaLocked: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(124,92,255,0.5)'
  }
});
