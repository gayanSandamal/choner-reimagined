import { ScrollView } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Card } from '@/components/ui/Card';
import { AppText } from '@/components/ui/AppText';
import { theme } from '@/constants/theme';

export default function ProfileScreen() {
  return (
    <Screen scroll={false}>
      <ScrollView contentContainerStyle={{ gap: theme.spacing(2), paddingBottom: theme.spacing(4) }}>
        <SectionHeader title="Profile" subtitle="Your goals, settings, and account" />
        <Card>
          <AppText variant="subtitle">Choner User</AppText>
          <AppText muted>Goal: consistency • Mode: partner accountability</AppText>
        </Card>
        <Card>
          <AppText variant="label" onPress={() => router.push('/settings')}>Open settings</AppText>
          <AppText variant="label" onPress={() => router.push('/modals/premium')}>Premium</AppText>
          <AppText variant="label" onPress={() => supabase.auth.signOut()}>Sign out</AppText>
        </Card>
      </ScrollView>
    </Screen>
  );
}
