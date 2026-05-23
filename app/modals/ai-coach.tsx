import { ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { AppText } from '@/components/ui/AppText';
import { theme } from '@/constants/theme';

export default function AiCoachModal() {
  return (
    <Screen scroll={false}>
      <ScrollView contentContainerStyle={{ gap: theme.spacing(2), paddingBottom: theme.spacing(4) }}>
        <ScreenHeader title="AI Coach" onClose={() => router.back()} />
        
        <Card style={{ marginTop: theme.spacing(2) }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Ionicons name="fitness" size={20} color={theme.colors.primary} />
            <AppText variant="label" style={{ color: theme.colors.primary }}>Suggested recovery</AppText>
          </View>
          <AppText muted>You missed two evening check-ins. Shift the sleep task 30 minutes earlier tonight and keep movement light.</AppText>
        </Card>
        
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Ionicons name="chatbubbles" size={20} color={theme.colors.text} />
            <AppText variant="label">Prompt ideas</AppText>
          </View>
          <AppText muted>{"• I missed 3 days, help me restart\n• Make my challenge easier\n• Why do I lose consistency on weekends?"}</AppText>
        </Card>
      </ScrollView>
    </Screen>
  );
}
