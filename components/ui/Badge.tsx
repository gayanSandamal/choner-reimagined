import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AppText } from './AppText';
import { theme, GradientName } from '@/constants/theme';

interface Props {
  label: string;
  tone?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral';
  gradient?: GradientName;
  variant?: 'solid' | 'gradient' | 'soft';
}

export function Badge({ label, tone = 'primary', gradient = 'warm', variant = 'soft' }: Props) {
  if (variant === 'gradient') {
    return (
      <LinearGradient
        colors={theme.gradients[gradient] as unknown as readonly [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <AppText style={[styles.label, { color: '#FFF' }]}>{label}</AppText>
      </LinearGradient>
    );
  }

  const toneColor =
    tone === 'success'
      ? theme.colors.success
      : tone === 'warning'
      ? theme.colors.warning
      : tone === 'danger'
      ? theme.colors.danger
      : tone === 'neutral'
      ? theme.colors.muted
      : theme.colors.primary;

  if (variant === 'solid') {
    return (
      <View style={[styles.base, { backgroundColor: toneColor }]}>
        <AppText style={[styles.label, { color: '#FFF' }]}>{label}</AppText>
      </View>
    );
  }

  // soft
  return (
    <View
      style={[
        styles.base,
        { backgroundColor: `${toneColor}22`, borderWidth: 1, borderColor: `${toneColor}55` }
      ]}
    >
      <AppText style={[styles.label, { color: toneColor }]}>{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radius.pill,
    alignSelf: 'flex-start'
  },
  gradient: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radius.pill,
    alignSelf: 'flex-start'
  },
  label: {
    fontFamily: theme.fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase'
  }
});
