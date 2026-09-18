import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { PressableScale } from './PressableScale';
import { theme } from '@/constants/theme';

interface Props {
  value: number;
  onChange: (value: number) => void;
  unit?: string;
  step?: number;
  min?: number;
  max?: number;
}

// A "− value unit +" row for the onboarding target/commitment questions and
// the Home starting-point prompt. No numeric input existed anywhere in the
// app before this — built on the same PressableScale + AppText + theme
// primitives every other onboarding control uses.
export function NumberStepper({ value, onChange, unit, step = 1, min = 0, max = 999 }: Props) {
  const dec = () => onChange(Math.max(min, Math.round((value - step) * 100) / 100));
  const inc = () => onChange(Math.min(max, Math.round((value + step) * 100) / 100));

  return (
    <View style={styles.row}>
      <PressableScale
        style={styles.button}
        scaleTo="subtle"
        haptic="selection"
        disabled={value <= min}
        onPress={dec}
        accessibilityRole="button"
        accessibilityLabel="Decrease"
      >
        <Ionicons name="remove" size={20} color={theme.colors.text} />
      </PressableScale>

      <View style={styles.valueBlock}>
        <AppText variant="title" style={styles.value}>
          {value}
        </AppText>
        {unit ? (
          <AppText variant="caption" muted>
            {unit}
          </AppText>
        ) : null}
      </View>

      <PressableScale
        style={styles.button}
        scaleTo="subtle"
        haptic="selection"
        disabled={value >= max}
        onPress={inc}
        accessibilityRole="button"
        accessibilityLabel="Increase"
      >
        <Ionicons name="add" size={20} color={theme.colors.text} />
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing(3)
  },
  button: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center'
  },
  valueBlock: { alignItems: 'center', minWidth: 88 },
  value: { fontSize: 30, lineHeight: 36 }
});
