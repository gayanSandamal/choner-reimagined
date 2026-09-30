import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/button';
import { IconName } from '@/components/ui/Icon';
import { AnimatedBrandLogo } from '@/components/auth/AnimatedBrandLogo';
import { PromiseCard } from '@/components/onboarding/PromiseCard';
import { ProgressDots } from '@/components/onboarding/ProgressDots';
import { theme } from '@/constants/theme';

const PROMISES: { icon: IconName; title: string; description: string }[] = [
  {
    icon: 'together',
    title: 'One partner, real accountability',
    description: "Not a crowd, not a stranger's app. One person counting on you"
  },
  {
    icon: 'target',
    title: 'Personalised from day one',
    description: 'Your goals and struggles shape your first challenge'
  },
  {
    icon: 'trend',
    title: 'Built to grow with you',
    description: 'More ways to stay consistent are coming'
  }
];

// One way forward. "I'll explore on my own" was removed because matching
// needs age and gender, and nothing on Home asks for them afterwards: anyone
// who took that door reached a Home that could never find them a partner.
export default function WelcomeScreen() {
  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ProgressDots current={1} />
        <Animated.View entering={FadeInDown.duration(360)} style={styles.hero}>
          <AnimatedBrandLogo size={120} />
          <AppText variant="title" style={styles.headline}>
            Turn “I should” into “I did”
          </AppText>
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(140).duration(360)} style={styles.cards}>
          {PROMISES.map((p) => (
            <PromiseCard key={p.title} {...p} />
          ))}
        </Animated.View>
      </ScrollView>
      <Animated.View entering={FadeInDown.delay(260).duration(360)} style={styles.footer}>
        <Button label="Build my profile" onPress={() => router.push('/onboarding/goal')} />
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: 20, paddingTop: theme.spacing(2), gap: theme.spacing(3), flexGrow: 1 },
  hero: { alignItems: 'center', gap: theme.spacing(1.5) },
  headline: { textAlign: 'center' },
  cards: { gap: theme.spacing(1.5) },
  footer: { padding: 20, paddingTop: theme.spacing(1), gap: theme.spacing(1) }
});
