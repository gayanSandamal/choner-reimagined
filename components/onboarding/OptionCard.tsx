import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring
} from 'react-native-reanimated';
import { AppText } from '@/components/ui/AppText';
import { PressableScale } from '@/components/ui/PressableScale';
import { theme } from '@/constants/theme';

type Layout = 'grid' | 'row' | 'pill';

interface Props {
  icon: string;
  label: string;
  description?: string;
  selected: boolean;
  onPress: () => void;
  // grid: 2-column tile (Screen 2) · row: full-width, icon left (Screens 3-4)
  // pill: compact vertical tile sharing a row equally (Screen 5)
  layout?: Layout;
}

export function OptionCard({ icon, label, description, selected, onPress, layout = 'row' }: Props) {
  const t = useSharedValue(selected ? 1 : 0);

  useEffect(() => {
    t.value = withSpring(selected ? 1 : 0, theme.motion.spring.gentle);
  }, [selected]);

  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      t.value,
      [0, 1],
      [theme.colors.surface, theme.colors.surface2]
    ),
    borderColor: interpolateColor(t.value, [0, 1], [theme.colors.border, theme.colors.primary2])
  }));

  const vertical = layout !== 'row';

  return (
    <PressableScale
      onPress={onPress}
      scaleTo="subtle"
      haptic="selection"
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={description ? `${label}. ${description}` : label}
      style={layout === 'grid' ? styles.gridSlot : layout === 'pill' ? styles.pillSlot : styles.rowSlot}
    >
      <Animated.View
        style={[styles.base, vertical ? styles.vertical : styles.horizontal, animatedStyle]}
      >
        <View style={[styles.iconBox, layout === 'pill' && styles.iconBoxSm]}>
          <AppText style={layout === 'pill' ? styles.iconSm : styles.icon}>{icon}</AppText>
        </View>
        <View style={[styles.textBlock, vertical ? styles.textBlockCentered : styles.textBlockFill]}>
          <AppText variant="subtitle" style={layout === 'pill' && styles.pillLabel}>
            {label}
          </AppText>
          {description ? (
            <AppText variant="caption" muted style={vertical ? styles.centeredText : undefined}>
              {description}
            </AppText>
          ) : null}
        </View>
      </Animated.View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  // Slots let the pressable own the flex sizing while the animated card fills it.
  // grid/pill cards sit inside an explicit row View owned by the screen.
  gridSlot: { flex: 1 },
  pillSlot: { flex: 1 },
  rowSlot: { width: '100%' },
  base: {
    borderRadius: theme.radius.md,
    borderWidth: 1,
    padding: theme.spacing(2),
    gap: theme.spacing(1.5)
  },
  horizontal: { flexDirection: 'row', alignItems: 'center' },
  vertical: { alignItems: 'center', justifyContent: 'center', flexGrow: 1 },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surface3,
    alignItems: 'center',
    justifyContent: 'center'
  },
  iconBoxSm: { width: 36, height: 36 },
  icon: { fontSize: 22, lineHeight: 28 },
  iconSm: { fontSize: 18, lineHeight: 24 },
  // No `flex: 0` here — RN maps it to flex-basis:0% on web, collapsing the
  // block to zero height and letting the text paint outside the card.
  textBlock: { gap: 2 },
  textBlockFill: { flex: 1 },
  textBlockCentered: { alignItems: 'center' },
  centeredText: { textAlign: 'center' },
  pillLabel: { fontSize: 15 }
});
