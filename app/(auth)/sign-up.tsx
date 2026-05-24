import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { Link, router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { signUp } from '@/features/auth/api';
import { SignUpInput, signUpSchema } from '@/features/auth/schema';
import { theme } from '@/constants/theme';

export default function SignUpScreen() {
  const [loading, setLoading] = useState(false);
  const { control, handleSubmit, formState: { errors } } = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { fullName: '', email: '', password: '', confirmPassword: '', acceptTerms: false as unknown as true },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      setLoading(true);
      const result = await signUp(values);
      if (result.needsVerification) {
        router.replace({ pathname: '/(auth)/verify-email', params: { email: values.email } });
      } else {
        router.replace('/onboarding');
      }
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
      <Controller control={control} name="confirmPassword" render={({ field: { onChange, value } }) => (
        <Input label="Confirm password" secureTextEntry value={value} onChangeText={onChange} error={errors.confirmPassword?.message} />
      )} />
      <Controller control={control} name="acceptTerms" render={({ field: { onChange, value } }) => (
        <Pressable
          onPress={() => onChange(!value)}
          style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginVertical: 8 }}
        >
          <View style={{
            width: 22, height: 22, borderRadius: 6, borderWidth: 2,
            borderColor: value ? theme.colors.primary : theme.colors.border,
            backgroundColor: value ? theme.colors.primary : 'transparent',
            alignItems: 'center', justifyContent: 'center', marginTop: 2,
          }}>
            {value ? <AppText style={{ color: '#000', fontWeight: '900' }}>✓</AppText> : null}
          </View>
          <AppText variant="muted" style={{ flex: 1 }}>
            I agree to Choner's Terms of Service, Privacy Policy and Health Disclaimer.
          </AppText>
        </Pressable>
      )} />
      {errors.acceptTerms ? (
        <AppText variant="caption" style={{ color: theme.colors.danger }}>{errors.acceptTerms.message as string}</AppText>
      ) : null}
      <Button label={loading ? 'Creating...' : 'Create account'} onPress={onSubmit} disabled={loading} />
      <Link href="/(auth)/sign-in" asChild>
        <Button label="Already have an account? Sign in" variant="secondary" />
      </Link>
    </Screen>
  );
}
