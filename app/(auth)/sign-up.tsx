import { useState } from 'react';
import { Alert, View } from 'react-native';
import { Link, router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { signUp } from '@/features/auth/api';
import { SignUpInput, signUpSchema } from '@/features/auth/schema';

export default function SignUpScreen() {
  const [loading, setLoading] = useState(false);
  const { control, handleSubmit, formState: { errors } } = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { fullName: '', email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      setLoading(true);
      await signUp(values);
      router.replace('/onboarding');
    } catch (error: any) {
      Alert.alert('Sign up failed', error.message);
    } finally {
      setLoading(false);
    }
  });

  return (
    <Screen>
      <View style={{ gap: 8, marginTop: 24 }}>
        <AppText variant="title">Create your Choner account</AppText>
        <AppText variant="muted">Get personalized challenges, accountability, and AI support.</AppText>
      </View>
      <Controller control={control} name="fullName" render={({ field: { onChange, value } }) => (
        <Input label="Full name" value={value} onChangeText={onChange} error={errors.fullName?.message} />
      )} />
      <Controller control={control} name="email" render={({ field: { onChange, value } }) => (
        <Input label="Email" autoCapitalize="none" keyboardType="email-address" value={value} onChangeText={onChange} error={errors.email?.message} />
      )} />
      <Controller control={control} name="password" render={({ field: { onChange, value } }) => (
        <Input label="Password" secureTextEntry value={value} onChangeText={onChange} error={errors.password?.message} />
      )} />
      <Button label={loading ? 'Creating...' : 'Create account'} onPress={onSubmit} disabled={loading} />
      <Link href="/(auth)/sign-in" asChild>
        <Button label="Already have an account? Sign in" variant="secondary" />
      </Link>
    </Screen>
  );
}
