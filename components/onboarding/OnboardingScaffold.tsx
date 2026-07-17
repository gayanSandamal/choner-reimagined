import { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppText } from '@/components/ui/AppText';
import { ProgressDots } from './ProgressDots';
import { theme } from '@/constants/theme';

// Shared chrome for the quiz screens (2-5): progress dots, step label,
// headline/subline, scrollable options, pinned footer. Onboarding renders
// outside the app shell, so this owns the full-screen frame.
interface Props extends PropsWithChildren {
  dot: number;
  step?: number;
  title: string;
  subtitle?: string;
  reassurance?: string;
  footer: React.ReactNode;
}

export function OnboardingScaffold({ dot, step, title, subtitle, reassurance, footer, children }: Props) {
  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <ProgressDots current={dot} />
        {step ? (
          <AppText variant="label" muted style={styles.step}>
            Step {step} of 4
          </AppText>
        ) : null}
        <Animated.View entering={FadeInDown.duration(360)} style={styles.headings}>
          <AppText variant="title">{title}</AppText>
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
  header: { paddingHorizontal: 20, paddingTop: theme.spacing(2), gap: theme.spacing(2) },
  step: { textAlign: 'center' },
  headings: { gap: theme.spacing(1) },
  body: { padding: 20, gap: theme.spacing(2), flexGrow: 1 },
  // Column of options; screens compose their own explicit rows for
  // grid/pill layouts (percentage-basis wrap mis-measures on web).
  options: { gap: theme.spacing(1.5) },
  reassurance: { textAlign: 'center' },
  footer: { padding: 20, paddingTop: theme.spacing(1), gap: theme.spacing(1) }
});
