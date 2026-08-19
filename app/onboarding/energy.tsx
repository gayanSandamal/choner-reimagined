import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { OnboardingScaffold } from '@/components/onboarding/OnboardingScaffold';
import { OptionCard } from '@/components/onboarding/OptionCard';
import { ENERGY_LEVELS } from '@/features/onboarding/constants';
import { useOnboarding } from '@/features/onboarding/context';
import { goalToTemplateSlug } from '@/features/onboarding/mappings';
import { getTemplateBySlug } from '@/features/challenges/api';
import { useEnsureUserChallenge } from '@/features/challenges/hooks';
import { useSession } from '@/providers/session-provider';
import { useUpdateProfile } from '@/features/profile/hooks';
import { cityFromTimezone } from '@/features/community/milestones';
import { theme } from '@/constants/theme';
import { notify } from '@/lib/alert';

export default function EnergyScreen() {
  const { session } = useSession();
  const qc = useQueryClient();
  const updateProfile = useUpdateProfile();
  const ensureChallenge = useEnsureUserChallenge();
  const { goal, struggle, tone, energy, setEnergy } = useOnboarding();

  const deviceTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

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
          // Captured here rather than asked for. The column defaults to 'UTC',
          // and until now it was only ever corrected if someone happened to
          // open the deadline settings — which left the derived city wrong for
          // everyone else, and the Community feed is scoped by city.
          timezone: deviceTimezone,
          city: cityFromTimezone(deviceTimezone),
          onboarding_complete: true
        }
      });
      // Prime the cache so the routing gate sees onboarding_complete=true.
      qc.setQueryData(['profile', userId], row);

      // Provision the user's challenge from the goal-matched habit so Home has
      // something the moment onboarding ends. Best-effort: a failure here must
      // not trap the user on onboarding — the RPC is idempotent and Step 1
      // re-ensures if needed.
      try {
        const template = await getTemplateBySlug(goalToTemplateSlug(goal));
        await ensureChallenge.mutateAsync({ userId, templateId: template?.id });
      } catch {
        // Swallowed on purpose — see note above.
      }

      router.push('/onboarding/reveal');
    } catch (error: any) {
      notify('Could not save your profile', error.message);
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
