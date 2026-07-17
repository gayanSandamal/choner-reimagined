import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/button';
import { AnimatedBrandLogo } from '@/components/auth/AnimatedBrandLogo';
import { PromiseCard } from '@/components/onboarding/PromiseCard';
import { ProgressDots } from '@/components/onboarding/ProgressDots';
import { useSession } from '@/providers/session-provider';
import { useUpdateProfile } from '@/features/profile/hooks';
import { theme } from '@/constants/theme';

const PROMISES = [
  {
    icon: '🤝',
    title: 'One partner, real accountability',
    description: "Not a crowd, not a stranger's app — one person counting on you"
  },
  {
    icon: '🎯',
    title: 'Personalised from day one',
    description: 'Your goals and struggles shape your first challenge'
  },
  {
    icon: '📈',
    title: 'Built to grow with you',
    description: 'More ways to stay consistent are coming'
  }
];

export default function WelcomeScreen() {
  const { session } = useSession();
  const qc = useQueryClient();
  const updateProfile = useUpdateProfile();
  const [skipping, setSkipping] = useState(false);

  const onExplore = async () => {
    const userId = session?.user.id;
    if (!userId) return;
    try {
      setSkipping(true);
      const row = await updateProfile.mutateAsync({
        userId,
        payload: { onboarding_complete: true }
      });
      // Prime the cache before navigating so the routing gate in
      // app/_layout.tsx doesn't bounce us back into onboarding.
      qc.setQueryData(['profile', userId], row);
      router.replace('/(tabs)/home');
    } catch (error: any) {
      setSkipping(false);
      Alert.alert('Something went wrong', error.message);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ProgressDots current={1} />
        <Animated.View entering={FadeInDown.duration(360)} style={styles.hero}>
          <AnimatedBrandLogo size={120} />
          <AppText variant="title" style={styles.headline}>
            Turn “I should” into “I did”
          </AppText>
          <AppText variant="caption" muted>
            Takes about a minute.
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
        <Button
          label="I'll explore on my own"
          variant="ghost"
          loading={skipping}
          onPress={onExplore}
        />
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
