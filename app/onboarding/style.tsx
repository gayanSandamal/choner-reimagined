import { router } from 'expo-router';
import { Button } from '@/components/ui/button';
import { OnboardingScaffold } from '@/components/onboarding/OnboardingScaffold';
import { OptionCard } from '@/components/onboarding/OptionCard';
import { TONES } from '@/features/onboarding/constants';
import { useOnboarding } from '@/features/onboarding/context';

export default function StyleScreen() {
  const { tone, setTone } = useOnboarding();

  return (
    <OnboardingScaffold
      dot={4}
      step={3}
      title="How do you want Choner to talk to you?"
      subtitle="This shapes your nudges and how your partner challenge feels day to day."
      reassurance="You can change this any time in your settings."
      footer={
        <Button
          label="This is me — let's go"
          disabled={!tone}
          onPress={() => router.push('/onboarding/energy')}
        />
      }
    >
      {TONES.map((option) => (
        <OptionCard
          key={option.value}
          layout="row"
          icon={option.icon}
          label={option.label}
          description={option.description}
          selected={tone === option.value}
          onPress={() => setTone(option.value)}
        />
      ))}
    </OnboardingScaffold>
  );
}
