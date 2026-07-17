import { Alert, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { OnboardingScaffold } from '@/components/onboarding/OnboardingScaffold';
import { OptionCard } from '@/components/onboarding/OptionCard';
import { ENERGY_LEVELS } from '@/features/onboarding/constants';
import { useOnboarding } from '@/features/onboarding/context';
import { useSession } from '@/providers/session-provider';
import { useUpdateProfile } from '@/features/profile/hooks';
import { theme } from '@/constants/theme';

export default function EnergyScreen() {
  const { session } = useSession();
  const qc = useQueryClient();
  const updateProfile = useUpdateProfile();
  const { goal, struggle, tone, energy, setEnergy } = useOnboarding();

  const onSeeProfile = async () => {
    const userId = session?.user.id;
    if (!userId || !tone || !energy) return;
    try {
      // Single save for the whole quiz, so Screen 6's "Profile saved" badge
      // is truthful. Skipped answers are omitted (not nulled) so they can't
      // wipe values a returning user saved through the old onboarding.
      const row = await updateProfile.mutateAsync({
        userId,
        payload: {
          ...(goal ? { primary_goal: goal } : {}),
          ...(struggle ? { main_struggle: struggle } : {}),
          accountability_mode: tone,
          stress_level: energy,
          onboarding_complete: true
        }
      });
      // Prime the cache so the routing gate sees onboarding_complete=true.
      qc.setQueryData(['profile', userId], row);
      router.push('/onboarding/reveal');
    } catch (error: any) {
      Alert.alert('Could not save your profile', error.message);
    }
  };

  return (
    <OnboardingScaffold
      dot={5}
      step={4}
      title="How are you feeling this week?"
      subtitle="Choner adjusts your first week based on this — no pressure either way."
      reassurance="This isn't a test. There's no wrong answer."
      footer={
        <Button
          label="See my profile"
          disabled={!energy}
          loading={updateProfile.isPending}
          onPress={onSeeProfile}
        />
      }
    >
      <View style={styles.row}>
        {ENERGY_LEVELS.map((option) => (
          <OptionCard
            key={option.value}
            layout="pill"
            icon={option.icon}
            label={option.label}
            description={option.description}
            selected={energy === option.value}
            onPress={() => setEnergy(option.value)}
          />
        ))}
      </View>
    </OnboardingScaffold>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: theme.spacing(1.5) }
});
