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
        <Stack.Screen name="age" />
        <Stack.Screen name="energy" />
        {/* Once the profile is saved the quiz shouldn't be swipe-back reachable. */}
        <Stack.Screen name="reveal" options={{ gestureEnabled: false }} />
        {/* Optional, and deliberately after the reveal: the photo is asked for
            once the person has seen what Choner made of their answers. */}
        <Stack.Screen name="photo" />
        {/* Pick the habit. Swiping back into the picker after it is applied
            would let someone change it behind a partner who already joined.
            How much and how often are NOT asked here: they are agreed by both
            people at the first plan, so there is nothing to inherit. */}
        <Stack.Screen name="challenge" options={{ gestureEnabled: false }} />
        <Stack.Screen name="invite" options={{ gestureEnabled: false }} />
      </Stack>
    </OnboardingProvider>
  );
}
