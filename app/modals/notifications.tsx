import { ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ListItem } from '@/components/ui/ListItem';
import { AppText } from '@/components/ui/AppText';
import { theme } from '@/constants/theme';

export default function NotificationsModal() {
  return (
    <Screen scroll={false}>
      <ScrollView contentContainerStyle={{ gap: theme.spacing(1), paddingBottom: theme.spacing(4) }}>
        <ScreenHeader title="Notifications" onClose={() => router.back()} />
        
        <View style={{ marginTop: theme.spacing(2), marginBottom: theme.spacing(1) }}>
          <AppText variant="label" muted style={{ paddingLeft: theme.spacing(1) }}>Today</AppText>
        </View>
        <ListItem 
          title="Partner Activity" 
          subtitle="Your partner already checked in. Keep your streak alive." 
          icon="people" 
        />
        
        <View style={{ marginTop: theme.spacing(3), marginBottom: theme.spacing(1) }}>
          <AppText variant="label" muted style={{ paddingLeft: theme.spacing(1) }}>Yesterday</AppText>
        </View>
        <ListItem 
          title="AI Coach Suggestion" 
          subtitle="AI suggested a lighter Saturday target to reduce weekend drop-off." 
          icon="sparkles" 
        />
      </ScrollView>
    </Screen>
  );
}
