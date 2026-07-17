import { router } from 'expo-router';
import { Button } from '@/components/ui/button';
import { OnboardingScaffold } from '@/components/onboarding/OnboardingScaffold';
import { OptionCard } from '@/components/onboarding/OptionCard';
import { STRUGGLES } from '@/features/onboarding/constants';
import { useOnboarding } from '@/features/onboarding/context';

export default function StruggleScreen() {
  const { struggle, setStruggle } = useOnboarding();

  const next = () => router.push('/onboarding/style');

  return (
    <OnboardingScaffold
      dot={3}
      step={2}
      title="What's stopped you before?"
      subtitle="Be honest — this is how Choner knows where to support you most."
      reassurance="This is more common than you think."
      footer={
        <>
          <Button label="Continue" disabled={!struggle} onPress={next} />
          <Button
            label="Skip for now"
            variant="ghost"
            onPress={() => {
              setStruggle(null);
              next();
            }}
          />
        </>
      }
    >
      {STRUGGLES.map((option) => (
        <OptionCard
          key={option.value}
          layout="row"
          icon={option.icon}
          label={option.label}
          description={option.description}
          selected={struggle === option.value}
          onPress={() => setStruggle(option.value)}
        />
      ))}
    </OnboardingScaffold>
  );
}
