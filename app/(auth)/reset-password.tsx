import { useState } from 'react';
import { Alert, View } from 'react-native';
import { router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { updatePassword } from '@/features/auth/api';
import { ResetPasswordInput, resetPasswordSchema } from '@/features/auth/schema';

export default function ResetPasswordScreen() {
  const [loading, setLoading] = useState(false);
  const { control, handleSubmit, formState: { errors } } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const onSubmit = handleSubmit(async ({ password }) => {
    try {
      setLoading(true);
      await updatePassword(password);
      Alert.alert('Password updated', 'You are signed in with your new password.', [
        { text: 'Continue', onPress: () => router.replace('/(tabs)/home') },
      ]);
    } catch (error: any) {
      Alert.alert('Could not update password', error.message);
    } finally {
      setLoading(false);
    }
  });

  return (
    <Screen>
      <View style={{ gap: 8, marginTop: 40 }}>
        <AppText variant="title">Set a new password</AppText>
        <AppText variant="muted">Pick something memorable — at least 8 characters.</AppText>
      </View>
      <Controller control={control} name="password" render={({ field: { onChange, value } }) => (
        <Input label="New password" secureTextEntry value={value} onChangeText={onChange} error={errors.password?.message} />
      )} />
      <Controller control={control} name="confirmPassword" render={({ field: { onChange, value } }) => (
        <Input label="Confirm new password" secureTextEntry value={value} onChangeText={onChange} error={errors.confirmPassword?.message} />
      )} />
      <Button label={loading ? 'Saving...' : 'Save password'} onPress={onSubmit} disabled={loading} />
    </Screen>
  );
}
