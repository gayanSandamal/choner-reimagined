import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Button } from '@/components/ui/button';
import { AppText } from '@/components/ui/AppText';
import { OnboardingScaffold } from '@/components/onboarding/OnboardingScaffold';
import { OptionCard } from '@/components/onboarding/OptionCard';
import { AGE_BANDS, GENDERS } from '@/features/onboarding/constants';
import { useOnboarding } from '@/features/onboarding/context';
import { theme } from '@/constants/theme';

// Step 4 of 5 — age band + gender, inserted between style and energy.
// Both questions land in context here and are written once, alongside the
// rest of the quiz, on the energy screen's single profile save.
export default function AgeScreen() {
  const { ageRange, setAgeRange, gender, setGender } = useOnboarding();

  const next = () => router.push('/onboarding/energy');

  return (
    <OnboardingScaffold
      dot={5}
      step={4}
      title="How old are "
      titleEmphasis="you?"
      subtitle="Helps us pair you with someone at a similar stage."
      footer={
        <>
          <Button label="Continue" disabled={!ageRange || !gender} onPress={next} />
          <Button
            label="Skip for now"
            variant="ghost"
            onPress={() => {
              setAgeRange(null);
              setGender(null);
              next();
            }}
          />
        </>
      }
    >
      <View style={styles.row}>
        {AGE_BANDS.slice(0, 3).map((option) => (
          <OptionCard
            key={option.value}
            layout="pill"
            icon={option.icon}
            label={option.label}
            selected={ageRange === option.value}
            onPress={() => setAgeRange(option.value)}
          />
        ))}
      </View>
      <View style={styles.row}>
        {AGE_BANDS.slice(3).map((option) => (
          <OptionCard
            key={option.value}
            layout="pill"
            icon={option.icon}
            label={option.label}
            selected={ageRange === option.value}
            onPress={() => setAgeRange(option.value)}
          />
        ))}
      </View>

      <AppText variant="label" muted style={styles.sectionLabel}>
        What's your gender?
      </AppText>
      <View style={styles.row}>
        {GENDERS.map((option) => (
          <OptionCard
            key={option.value}
            layout="pill"
            icon={option.icon}
            label={option.label}
            selected={gender === option.value}
            onPress={() => setGender(option.value)}
          />
        ))}
      </View>
    </OnboardingScaffold>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: theme.spacing(1.5) },
  sectionLabel: { marginTop: theme.spacing(1) }
});
