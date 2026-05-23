import { useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ListItem } from '@/components/ui/ListItem';
import { AppText } from '@/components/ui/AppText';
import { theme } from '@/constants/theme';

export default function SettingsScreen() {
  const [isPrivate, setIsPrivate] = useState(false);

  const togglePrivacy = () => {
    const nextVal = !isPrivate;
    setIsPrivate(nextVal);
    Alert.alert(
      "Privacy Updated",
      `Your challenge activity is now ${nextVal ? 'Private' : 'Public'}.`
    );
  };

  const handleSignOut = async () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Sign Out", style: "destructive", onPress: () => supabase.auth.signOut() }
      ]
    );
  };

  return (
    <Screen scroll={false}>
      <ScrollView contentContainerStyle={{ gap: theme.spacing(1), paddingBottom: theme.spacing(4) }}>
        <ScreenHeader title="Settings" onBack={() => router.back()} />
        
        <View style={{ marginTop: theme.spacing(2), marginBottom: theme.spacing(1) }}>
          <AppText variant="label" muted style={{ paddingLeft: theme.spacing(1) }}>Preferences</AppText>
        </View>
        <ListItem 
          title="Notifications" 
          subtitle="Configure streak reminders, community nudges, and recovery suggestions." 
          icon="notifications" 
          showChevron 
          onPress={() => router.push('/modals/notifications')}
        />
        <ListItem 
          title="Privacy & Visibility" 
          subtitle={`Current Mode: ${isPrivate ? 'Private' : 'Public'}`} 
          icon="lock-closed" 
          showChevron 
          onPress={togglePrivacy}
        />

        <View style={{ marginTop: theme.spacing(3), marginBottom: theme.spacing(1) }}>
          <AppText variant="label" muted style={{ paddingLeft: theme.spacing(1) }}>Account</AppText>
        </View>
        <ListItem 
          title="Sign Out" 
          subtitle="Sign out of your Choner account"
          icon="log-out" 
          onPress={handleSignOut}
        />
      </ScrollView>
    </Screen>
  );
}
