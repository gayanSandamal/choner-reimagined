import { Tabs } from 'expo-router';
import { CustomTabBar } from '@/components/navigation/CustomTabBar';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <CustomTabBar {...(props as any)} />}
    >
      <Tabs.Screen name="home" options={{ title: 'Home' }} />
      <Tabs.Screen name="challenges" options={{ title: 'Challenges' }} />
      <Tabs.Screen name="find" options={{ title: 'Find' }} />
      <Tabs.Screen name="community" options={{ title: 'Community' }} />
      <Tabs.Screen name="insights" options={{ title: 'Insights' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
