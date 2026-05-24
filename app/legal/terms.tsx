import { ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { AppText } from '@/components/ui/AppText';
import { theme } from '@/constants/theme';

export default function TermsScreen() {
  return (
    <Screen scroll={false}>
      <ScrollView contentContainerStyle={{ gap: theme.spacing(2), paddingBottom: theme.spacing(4) }}>
        <ScreenHeader title="Terms of Service" onBack={() => router.back()} />
        <AppText variant="caption" muted>Last updated: 2026-05-24</AppText>
        <AppText>
          By using Choner you agree to these terms. Choner is a habit and accountability product
          designed to help you build consistency. It is not a medical service.
        </AppText>
        <AppText variant="subtitle">Your account</AppText>
        <AppText muted>
          You're responsible for keeping your login credentials secure. Don't impersonate others, share
          spam, or post content that is illegal, harassing, or harmful.
        </AppText>
        <AppText variant="subtitle">Subscriptions</AppText>
        <AppText muted>
          Premium subscriptions are billed by the App Store or Play Store. Manage or cancel from your
          device's subscription settings. Refunds are governed by the store's policies.
        </AppText>
        <AppText variant="subtitle">Termination</AppText>
        <AppText muted>
          You may delete your account at any time. We may suspend accounts that violate these terms
          or applicable law.
        </AppText>
      </ScrollView>
    </Screen>
  );
}
