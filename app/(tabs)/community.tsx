import { ScrollView, Share } from 'react-native';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Card } from '@/components/ui/Card';
import { AppText } from '@/components/ui/AppText';
import { InviteCard } from '@/components/community/InviteCard';
import { theme } from '@/constants/theme';

export default function CommunityScreen() {
  const handleInvite = async () => {
    try {
      await Share.share({
        message: 'Join me on Choner to build consistent habits together! Download the app and search for accountability group "Young Professionals Reset".',
      });
    } catch (error: any) {
      console.log('Share error:', error.message);
    }
  };

  return (
    <Screen scroll={false}>
      <ScrollView contentContainerStyle={{ gap: theme.spacing(2), paddingBottom: theme.spacing(4) }}>
        <SectionHeader title="Community" subtitle="Support, accountability, and shared momentum" />
        <InviteCard onPress={handleInvite} />
        <Card>
          <AppText variant="label">Your accountability group</AppText>
          <AppText muted>Young Professionals Reset • 12 members • 81% average completion</AppText>
        </Card>
        <Card>
          <AppText variant="label">Recent momentum</AppText>
          <AppText muted>Anna just completed day 6. Marcus shared a comeback streak after missing 3 days.</AppText>
        </Card>
      </ScrollView>
    </Screen>
  );
}
