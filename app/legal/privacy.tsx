import { ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { AppText } from '@/components/ui/AppText';
import { theme } from '@/constants/theme';

export default function PrivacyScreen() {
  return (
    <Screen scroll={false}>
      <ScrollView contentContainerStyle={{ gap: theme.spacing(2), paddingBottom: theme.spacing(4) }}>
        <ScreenHeader title="Privacy Policy" onBack={() => router.back()} />
        <AppText variant="caption" muted>Last updated: 2026-05-24</AppText>
        <AppText>
          Choner ("we", "us") collects only the information needed to provide the service: account
          information you give us (name, email), the goals and challenge data you create in-app, and
          basic device telemetry used to deliver notifications and diagnose crashes.
        </AppText>
        <AppText variant="subtitle">What we collect</AppText>
        <AppText muted>
          • Account: email, full name.{'\n'}
          • Profile: goals, struggles, accountability mode, stress level.{'\n'}
          • Activity: challenges started, tasks completed, posts and comments.{'\n'}
          • Device: push token, OS platform, app version.{'\n'}
          • Diagnostics: crash reports and anonymized analytics events.
        </AppText>
        <AppText variant="subtitle">How we use it</AppText>
        <AppText muted>
          We use your data only to operate Choner: deliver your challenges, send notifications you've
          opted in to, surface community posts, and improve the product. We never sell your data.
        </AppText>
        <AppText variant="subtitle">Your rights</AppText>
        <AppText muted>
          You can export or permanently delete your account at any time from Settings → Delete account.
          Email privacy@choner.app for any data request.
        </AppText>
      </ScrollView>
    </Screen>
  );
}
