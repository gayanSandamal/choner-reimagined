import { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/ui/AppText';
import { PressableScale } from '@/components/ui/PressableScale';
import { ProgressDots } from './ProgressDots';
import { theme } from '@/constants/theme';

// Shared chrome for the quiz screens (2-6): the floating navy step bar with
// its progress dots, headline/subline, scrollable options, pinned footer.
// Onboarding renders outside the app shell, so this owns the full-screen
// frame. Mirrors stepBar() in the Sept 2026 prototype.
interface Props extends PropsWithChildren {
  dot: number;
  step?: number;
  title: string;
  // Rendered semibold on the end of the title — the prototype's headline
  // signature is a light 300 weight with one bold span for emphasis.
  titleEmphasis?: string;
  subtitle?: string;
  reassurance?: string;
  footer: React.ReactNode;
}

export function OnboardingScaffold({
  dot,
  step,
  title,
  titleEmphasis,
  subtitle,
  reassurance,
  footer,
  children
}: Props) {
  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.stepBar}>
        <PressableScale
          onPress={() => (router.canGoBack() ? router.back() : undefined)}
          scaleTo="subtle"
          haptic="selection"
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={styles.backSlot}
        >
          <Ionicons name="chevron-back" size={20} color={theme.colors.onNavy} />
        </PressableScale>
        <ProgressDots current={dot} />
        <View style={styles.backSlot} />
      </View>

      <View style={styles.header}>
        {step ? (
          <AppText variant="label" muted style={styles.step}>
            Step {step} of 5
          </AppText>
        ) : null}
        <Animated.View entering={FadeInDown.duration(360)} style={styles.headings}>
          <AppText variant="title">
            {title}
            {titleEmphasis ? (
              <AppText variant="title" style={styles.emphasis}>
                {titleEmphasis}
              </AppText>
            ) : null}
          </AppText>
          {subtitle ? <AppText muted>{subtitle}</AppText> : null}
        </Animated.View>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.delay(120).duration(360)} style={styles.options}>
          {children}
        </Animated.View>
        {reassurance ? (
          <AppText variant="caption" muted style={styles.reassurance}>
            {reassurance}
          </AppText>
        ) : null}
      </ScrollView>
      <View style={styles.footer}>{footer}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  stepBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.navy,
    borderRadius: 24,
    marginHorizontal: 16,
    marginTop: 14,
    paddingHorizontal: 20,
    paddingVertical: 16,
    ...theme.shadow.lg
  },
  backSlot: { width: 20 },
  header: { paddingHorizontal: 20, paddingTop: theme.spacing(2), gap: theme.spacing(1) },
  step: { textTransform: 'uppercase', letterSpacing: 1 },
  headings: { gap: theme.spacing(1) },
  emphasis: { fontFamily: theme.fonts.bodyBold },
  body: { padding: 20, gap: theme.spacing(2), flexGrow: 1 },
  // Column of options; screens compose their own explicit rows for
  // grid/pill layouts (percentage-basis wrap mis-measures on web).
  options: { gap: theme.spacing(1.5) },
  reassurance: { textAlign: 'center' },
  footer: { padding: 20, paddingTop: theme.spacing(1), gap: theme.spacing(1) }
});
