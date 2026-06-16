import { useState } from 'react';
import { Alert, View } from 'react-native';
import { router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { requestPasswordReset } from '@/features/auth/api';
import { ForgotPasswordInput, forgotPasswordSchema } from '@/features/auth/schema';

export default function ForgotPasswordScreen() {
  const [loading, setLoading] = useState(false);
  const { control, handleSubmit, formState: { errors } } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = handleSubmit(async ({ email }) => {
    try {
      setLoading(true);
      await requestPasswordReset(email);
      Alert.alert('Check your email', 'We sent you a link to reset your password.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert('Could not send reset email', error.message);
    } finally {
      setLoading(false);
    }
  });

  return (
    <Screen>
      <View style={{ gap: 8, marginTop: 40 }}>
        <AppText variant="title">Reset your password</AppText>
        <AppText variant="muted">Enter your email and we'll send a link to set a new password.</AppText>
      </View>
      <Controller control={control} name="email" render={({ field: { onChange, value } }) => (
        <Input label="Email" autoCapitalize="none" keyboardType="email-address" value={value} onChangeText={onChange} error={errors.email?.message} />
      )} />
      <Button label={loading ? 'Sending...' : 'Send reset link'} onPress={onSubmit} disabled={loading} />
      <Button label="Back to sign in" variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}
