import { Linking, Platform, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ListItem } from '@/components/ui/ListItem';
import { AppText } from '@/components/ui/AppText';
import { signOut } from '@/features/auth/api';
import { useDeleteAccount } from '@/features/profile/hooks';
import { useIsPremium } from '@/features/billing/hooks';
import { features } from '@/constants/features';
import { theme } from '@/constants/theme';
import { confirmAction, notify } from '@/lib/alert';

const SUBSCRIPTION_URLS = {
  ios: 'itms-apps://apps.apple.com/account/subscriptions',
  android: 'https://play.google.com/store/account/subscriptions',
};

export default function SettingsScreen() {
  const deleteMut = useDeleteAccount();
  const { isPremium } = useIsPremium();

  const handleManageSubscription = () => {
    const url = Platform.OS === 'ios' ? SUBSCRIPTION_URLS.ios : SUBSCRIPTION_URLS.android;
    Linking.openURL(url).catch(() =>
      notify('Could not open', 'Manage your subscription from the App Store / Play Store.')
    );
  };

  const handleSignOut = async () => {
    const sure = await confirmAction({
      title: 'Sign out',
      message: 'Are you sure you want to sign out?',
      confirmLabel: 'Sign out',
      destructive: true
    });
    if (sure) signOut();
  };

  // Two confirmations on purpose: this is irreversible, and the second one
  // spells out that it cannot be undone rather than repeating the question.
  const handleDeleteAccount = async () => {
    const first = await confirmAction({
      title: 'Delete account',
      message: 'This will permanently delete your account and all data. This cannot be undone.',
      confirmLabel: 'Delete',
      destructive: true
    });
    if (!first) return;

    const second = await confirmAction({
      title: 'Are you sure?',
      message: 'Please confirm one more time.',
      confirmLabel: 'Yes, delete forever',
      destructive: true
    });
    if (!second) return;

    try {
      await deleteMut.mutateAsync();
    } catch (e: any) {
      notify('Could not delete', e.message);
    }
  };

  return (
    <Screen scroll={false}>
      <ScrollView contentContainerStyle={{ gap: theme.spacing(1), paddingBottom: theme.spacing(4) }}>
        <ScreenHeader title="Settings" onBack={() => router.back()} />

        <SectionLabel label="Preferences" />
        <ListItem
          title="Notifications"
          subtitle="Streak reminders, community nudges, and recovery suggestions."
          icon="notifications"
          showChevron
          onPress={() => router.push('/settings/notifications')}
        />
        <ListItem
          title="Daily deadline"
          subtitle="When your day is measured — and when your partner gets nudged."
          icon="time"
          showChevron
          onPress={() => router.push('/settings/deadline')}
        />
        <ListItem
          title="Edit profile"
          subtitle="Name, photo, goals."
          icon="person-circle"
          showChevron
          onPress={() => router.push('/profile/edit')}
        />

        {features.pro ? (
          <>
            <SectionLabel label="Billing" />
            <ListItem
              title={isPremium ? 'Manage subscription' : 'Upgrade to Premium'}
              subtitle={isPremium ? 'View, change, or cancel your subscription.' : 'Unlock AI coach, advanced insights, and more.'}
              icon={isPremium ? 'card' : 'sparkles'}
              showChevron
              onPress={() => (isPremium ? handleManageSubscription() : router.push('/modals/premium'))}
            />
          </>
        ) : null}

        <SectionLabel label="Legal" />
        <ListItem
          title="Privacy policy"
          icon="shield-checkmark"
          showChevron
          onPress={() => router.push('/legal/privacy')}
        />
        <ListItem
          title="Terms of service"
          icon="document-text"
          showChevron
          onPress={() => router.push('/legal/terms')}
        />
        <ListItem
          title="Health disclaimer"
          icon="medkit"
          showChevron
          onPress={() => router.push('/legal/health-disclaimer')}
        />

        <SectionLabel label="Account" />
        <ListItem title="Sign out" icon="log-out" onPress={handleSignOut} />
        <ListItem
          title="Delete account"
          subtitle="Permanently delete your account and data."
          icon="trash"
          onPress={handleDeleteAccount}
        />
      </ScrollView>
    </Screen>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <View style={{ marginTop: theme.spacing(2), marginBottom: theme.spacing(1) }}>
      <AppText variant="label" muted style={{ paddingLeft: theme.spacing(1) }}>{label}</AppText>
    </View>
  );
}
