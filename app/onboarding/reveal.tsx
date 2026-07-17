import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useOnboarding } from '@/features/onboarding/context';
import {
  energyToFirstWeek,
  firstNameFrom,
  goalLabel,
  personalitySummary,
  struggleLabel,
  toneLabel
} from '@/features/onboarding/mappings';
import { useSession } from '@/providers/session-provider';
import { useProfile } from '@/features/profile/hooks';
import { theme } from '@/constants/theme';

const SKIPPED_COPY = 'You skipped this — Choner adapts as you go';

export default function RevealScreen() {
  const { session } = useSession();
  const profileQ = useProfile(session?.user.id);
  const { goal, struggle, tone, energy } = useOnboarding();

  // Only reachable through the quiz; a stale deep link restarts the flow.
  if (!tone || !energy) return <Redirect href="/onboarding" />;

  const firstName = firstNameFrom(profileQ.data?.full_name);

  const setupRows = [
    { icon: '🎯', label: 'Your goal', value: goalLabel(goal) ?? SKIPPED_COPY },
    { icon: '🔥', label: 'Your challenge', value: struggleLabel(struggle) ?? SKIPPED_COPY },
    { icon: '💬', label: 'Your style', value: toneLabel(tone) ?? SKIPPED_COPY },
    { icon: '⚡', label: 'Your first week', value: energyToFirstWeek(energy) }
  ];

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(360)} style={styles.hero}>
          <AppText variant="label" muted>
            {firstName ? `We see you, ${firstName}` : 'We see you'}
          </AppText>
          <AppText variant="display" style={styles.styleName}>
            {toneLabel(tone)}
          </AppText>
          <AppText muted style={styles.summary}>
            {personalitySummary(struggle, tone)}
          </AppText>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(140).duration(360)}>
          <Card style={styles.setupCard}>
            {setupRows.map((row) => (
              <View key={row.label} style={styles.row}>
                <View style={styles.iconBox}>
                  <AppText style={styles.icon}>{row.icon}</AppText>
                </View>
                <View style={styles.rowText}>
                  <AppText variant="caption" muted>
                    {row.label}
                  </AppText>
                  <AppText variant="subtitle" style={styles.rowValue}>
                    {row.value}
                  </AppText>
                </View>
              </View>
            ))}
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(240).duration(360)} style={styles.meta}>
          <Badge label="✓ Profile saved" tone="success" />
          <AppText variant="caption" muted>
            Choner will refine this as you build your streak.
          </AppText>
        </Animated.View>
      </ScrollView>
      <Animated.View entering={FadeInDown.delay(320).duration(360)} style={styles.footer}>
        <Button
          label="Let's set up your first challenge"
          onPress={() => router.push('/onboarding/invite')}
        />
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: 20, paddingTop: theme.spacing(4), gap: theme.spacing(3), flexGrow: 1 },
  hero: { alignItems: 'center', gap: theme.spacing(1) },
  styleName: { textAlign: 'center', fontSize: 34, lineHeight: 40 },
  summary: { textAlign: 'center' },
  setupCard: { gap: theme.spacing(2) },
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing(1.5) },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surface3,
    alignItems: 'center',
    justifyContent: 'center'
  },
  icon: { fontSize: 20, lineHeight: 26 },
  rowText: { flex: 1, gap: 2 },
  rowValue: { fontSize: 16 },
  meta: { alignItems: 'center', gap: theme.spacing(1) },
  footer: { padding: 20, paddingTop: theme.spacing(1) }
});
