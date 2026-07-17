import { Stack } from 'expo-router';
import { OnboardingProvider } from '@/features/onboarding/context';
import { theme } from '@/constants/theme';

export default function OnboardingLayout() {
  return (
    <OnboardingProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.bg },
          animation: 'slide_from_right'
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="goal" />
        <Stack.Screen name="struggle" />
        <Stack.Screen name="style" />
        <Stack.Screen name="energy" />
        {/* Once the profile is saved the quiz shouldn't be swipe-back reachable. */}
        <Stack.Screen name="reveal" options={{ gestureEnabled: false }} />
        <Stack.Screen name="invite" options={{ gestureEnabled: false }} />
      </Stack>
    </OnboardingProvider>
  );
}
