import { useState } from 'react';
import { Alert, View } from 'react-native';
import { Link, router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { signIn } from '@/features/auth/api';
import { SignInInput, signInSchema } from '@/features/auth/schema';

export default function SignInScreen() {
  const [loading, setLoading] = useState(false);
  const { control, handleSubmit, formState: { errors } } = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      setLoading(true);
      await signIn(values);
      router.replace('/(tabs)/home');
    } catch (error: any) {
      Alert.alert('Sign in failed', error.message);
    } finally {
      setLoading(false);
    }
  });

  return (
    <Screen>
      <View style={{ gap: 8, marginTop: 40 }}>
        <AppText variant="title">Welcome back</AppText>
        <AppText variant="muted">Sign in to continue your current challenge and accountability streak.</AppText>
      </View>
      <Controller control={control} name="email" render={({ field: { onChange, value } }) => (
        <Input label="Email" autoCapitalize="none" keyboardType="email-address" value={value} onChangeText={onChange} error={errors.email?.message} />
      )} />
      <Controller control={control} name="password" render={({ field: { onChange, value } }) => (
        <Input label="Password" secureTextEntry value={value} onChangeText={onChange} error={errors.password?.message} />
      )} />
      <Button label={loading ? 'Signing in...' : 'Sign in'} onPress={onSubmit} disabled={loading} />
      <Link href="/(auth)/forgot-password" asChild>
        <Button label="Forgot password?" variant="ghost" />
      </Link>
      <Link href="/(auth)/sign-up" asChild>
        <Button label="Create account" variant="secondary" />
      </Link>
    </Screen>
  );
}
