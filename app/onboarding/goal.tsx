import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Button } from '@/components/ui/button';
import { OnboardingScaffold } from '@/components/onboarding/OnboardingScaffold';
import { OptionCard } from '@/components/onboarding/OptionCard';
import { GOALS } from '@/features/onboarding/constants';
import { useOnboarding } from '@/features/onboarding/context';
import { theme } from '@/constants/theme';

export default function GoalScreen() {
  const { goal, setGoal } = useOnboarding();

  const next = () => router.push('/onboarding/struggle');

  return (
    <OnboardingScaffold
      dot={2}
      step={1}
      title="What matters most to you right now?"
      subtitle="Choner shapes your first challenge around this."
      footer={
        <>
          <Button label="Continue" disabled={!goal} onPress={next} />
          <Button
            label="Skip for now"
            variant="ghost"
            onPress={() => {
              setGoal(null);
              next();
            }}
          />
        </>
      }
    >
      {[GOALS.slice(0, 2), GOALS.slice(2)].map((pair) => (
        <View key={pair[0].value} style={styles.row}>
          {pair.map((option) => (
            <OptionCard
              key={option.value}
              layout="grid"
              icon={option.icon}
              label={option.label}
              description={option.description}
              selected={goal === option.value}
              onPress={() => setGoal(option.value)}
            />
          ))}
        </View>
      ))}
    </OnboardingScaffold>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: theme.spacing(1.5) }
});
