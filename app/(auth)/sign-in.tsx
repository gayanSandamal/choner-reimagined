import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppText } from '@/components/ui/text';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AuroraBackground } from '@/components/auth/AuroraBackground';
import { BrandMark } from '@/components/auth/BrandMark';
import { signIn } from '@/features/auth/api';
import { SignInInput, signInSchema } from '@/features/auth/schema';
import { theme } from '@/constants/theme';
import { haptics } from '@/lib/haptics';

export default function SignInScreen() {
  const [loading, setLoading] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { errors }
  } = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' }
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      setLoading(true);
      await signIn(values);
      haptics.success();
      router.replace('/(tabs)/home');
    } catch (error: any) {
      haptics.error();
      Alert.alert('Sign in failed', error.message);
    } finally {
      setLoading(false);
    }
  });

  return (
    <AuroraBackground>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, padding: 20, gap: 16 }}
            keyboardShouldPersistTaps="handled"
          >
            <BrandMark tagline="Stay accountable. Build real momentum." />

            <Animated.View entering={FadeInDown.delay(120).duration(360)} style={{ gap: 6 }}>
              <AppText variant="title">Welcome back</AppText>
              <AppText variant="muted">
                Sign in to continue your current challenge and accountability streak.
              </AppText>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(200).duration(360)}>
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, value } }) => (
                  <Input
                    label="Email"
                    autoCapitalize="none"
                    autoComplete="email"
                    keyboardType="email-address"
                    value={value}
                    onChangeText={onChange}
                    error={errors.email?.message}
                  />
                )}
              />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(260).duration(360)}>
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, value } }) => (
                  <Input
                    label="Password"
                    secureTextEntry
                    autoComplete="password"
                    value={value}
                    onChangeText={onChange}
                    error={errors.password?.message}
                  />
                )}
              />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(320).duration(360)}>
              <Button
                label={loading ? 'Signing in…' : 'Sign in'}
                variant="gradient"
                loading={loading}
                onPress={onSubmit}
                size="lg"
              />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(380).duration(360)}>
              <Link href="/(auth)/forgot-password" asChild>
                <Button label="Forgot password?" variant="ghost" />
              </Link>
            </Animated.View>

            <Animated.View
              entering={FadeInDown.delay(440).duration(360)}
              style={{ marginTop: 'auto', flexDirection: 'row', justifyContent: 'center', gap: 6 }}
            >
              <AppText variant="muted">New here?</AppText>
              <Link href="/(auth)/sign-up">
                <AppText
                  style={{ color: theme.colors.primary2, fontFamily: theme.fonts.bodyBold }}
                >
                  Create an account
                </AppText>
              </Link>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </AuroraBackground>
  );
}
