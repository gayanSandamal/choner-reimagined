import { useState } from 'react';
import { Alert, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { resendVerification } from '@/features/auth/api';

export default function VerifyEmailScreen() {
  const { email } = useLocalSearchParams<{ email?: string }>();
  const [loading, setLoading] = useState(false);

  const onResend = async () => {
    if (!email) return;
    try {
      setLoading(true);
      await resendVerification(email);
      Alert.alert('Sent', 'A new verification email is on its way.');
    } catch (e: any) {
      Alert.alert('Could not resend', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <View style={{ gap: 8, marginTop: 40 }}>
        <AppText variant="title">Check your email</AppText>
        <AppText variant="muted">
          We sent a verification link to {email ?? 'your inbox'}. Tap it to finish creating your account.
        </AppText>
      </View>
      <Button label={loading ? 'Sending...' : 'Resend verification email'} onPress={onResend} disabled={loading || !email} />
      <Button label="Back to sign in" variant="ghost" onPress={() => router.replace('/(auth)/sign-in')} />
    </Screen>
  );
}
