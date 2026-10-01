import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/button';
import { IconName } from '@/components/ui/Icon';
import { AnimatedBrandLogo } from '@/components/auth/AnimatedBrandLogo';
import { IntroBackdrop } from '@/components/onboarding/IntroBackdrop';
import { IntroHeadline } from '@/components/onboarding/IntroHeadline';
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

// The intro. The one dark screen in a light app, on purpose: it is a title
// card, and the next screen is light again.
//
// One way forward. "I'll explore on my own" was removed because matching
// needs age and gender, and nothing on Home asks for them afterwards: anyone
// who took that door reached a Home that could never find them a partner.
export default function WelcomeScreen() {
  return (
    <View style={styles.root}>
      {/* Light on this screen only. The root layout sets the app's own style,
          and it takes over again as soon as this screen is left. */}
      <StatusBar style="light" />
      <IntroBackdrop />
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <ProgressDots current={1} gradient />
          <Animated.View entering={FadeInDown.duration(360)} style={styles.hero}>
            <AnimatedBrandLogo size={120} />
            <IntroHeadline />
            <AppText style={styles.sub}>
              Choner helps you stay{' '}
              <AppText style={styles.subStrong}>consistent with the healthy habits</AppText> you
              want to build.
            </AppText>
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(140).duration(360)} style={styles.cards}>
            {PROMISES.map((p) => (
              <PromiseCard key={p.title} {...p} glass />
            ))}
          </Animated.View>
        </ScrollView>
        <Animated.View entering={FadeInDown.delay(260).duration(360)} style={styles.footer}>
          <Button
            label="Build my profile"
            rightIcon={<Ionicons name="arrow-forward" size={18} color="#FFFFFF" />}
            onPress={() => router.push('/onboarding/goal')}
          />
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  // The flat colour is what shows for the frame before the SVG ground paints,
  // so it is the ground's own mid tone rather than the app's paper.
  root: { flex: 1, backgroundColor: '#001827' },
  safe: { flex: 1 },
  content: { padding: 20, paddingTop: theme.spacing(2), gap: theme.spacing(3), flexGrow: 1 },
  hero: { alignItems: 'center', gap: theme.spacing(1.5) },
  sub: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.72)',
    fontSize: 14.5,
    lineHeight: 22,
    paddingHorizontal: theme.spacing(1)
  },
  subStrong: { color: '#FFFFFF', fontSize: 14.5, lineHeight: 22, fontFamily: theme.fonts.bodyMedium },
  cards: { gap: theme.spacing(1.5) },
  footer: { padding: 20, paddingTop: theme.spacing(1), gap: theme.spacing(1) }
});
