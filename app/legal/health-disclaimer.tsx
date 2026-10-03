import { ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { AppText } from '@/components/ui/AppText';
import { theme } from '@/constants/theme';

export default function HealthDisclaimerScreen() {
  return (
    <Screen scroll={false}>
      <ScrollView contentContainerStyle={{ gap: theme.spacing(2), paddingBottom: theme.spacing(4) }}>
        <ScreenHeader title="Health Disclaimer" onBack={() => router.back()} />
        <AppText variant="caption" muted>Last updated: 2026-10-03</AppText>
        <AppText>
          Choner is a lifestyle app focused on habit consistency and accountability. It is not a
          medical device and does not provide medical advice, diagnosis, or treatment.
        </AppText>
        <AppText variant="subtitle">Talk to a professional</AppText>
        <AppText muted>
          Before starting a new exercise, sleep, or nutrition routine, consult a qualified healthcare
          provider, especially if you have any pre-existing condition, are pregnant, or are taking
          medication.
        </AppText>
      </ScrollView>
    </Screen>
  );
}
