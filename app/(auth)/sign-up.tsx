import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/ui/text';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AuroraBackground } from '@/components/auth/AuroraBackground';
import { BrandMark } from '@/components/auth/BrandMark';
import { signUp } from '@/features/auth/api';
import { SignUpInput, signUpSchema } from '@/features/auth/schema';
import { theme } from '@/constants/theme';
import { haptics } from '@/lib/haptics';

export default function SignUpScreen() {
  const [loading, setLoading] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { errors }
  } = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
      acceptTerms: false as unknown as true
    }
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      setLoading(true);
      const result = await signUp(values);
      haptics.success();
      if (result.needsVerification) {
        router.replace({ pathname: '/(auth)/verify-email', params: { email: values.email } });
      } else {
        router.replace('/onboarding');
      }
    } catch (error: any) {
      haptics.error();
      Alert.alert('Sign up failed', error.message);
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
            contentContainerStyle={{ flexGrow: 1, padding: 20, gap: 14 }}
            keyboardShouldPersistTaps="handled"
          >
            <BrandMark tagline="Build your accountability streak with us." />

            <Animated.View entering={FadeInDown.delay(100).duration(360)} style={{ gap: 6 }}>
              <AppText variant="title">Create your account</AppText>
              <AppText variant="muted">
                Personalized challenges, AI coaching, and a community that shows up.
              </AppText>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(160).duration(360)}>
              <Controller
                control={control}
                name="fullName"
                render={({ field: { onChange, value } }) => (
                  <Input
                    label="Full name"
                    value={value}
                    onChangeText={onChange}
                    error={errors.fullName?.message}
                  />
                )}
              />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(220).duration(360)}>
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, value } }) => (
                  <Input
                    label="Email"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoComplete="email"
                    value={value}
                    onChangeText={onChange}
                    error={errors.email?.message}
                  />
                )}
              />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(280).duration(360)}>
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, value } }) => (
                  <Input
                    label="Password"
                    secureTextEntry
                    value={value}
                    onChangeText={onChange}
                    error={errors.password?.message}
                  />
                )}
              />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(340).duration(360)}>
              <Controller
                control={control}
                name="confirmPassword"
                render={({ field: { onChange, value } }) => (
                  <Input
                    label="Confirm password"
                    secureTextEntry
                    value={value}
                    onChangeText={onChange}
                    error={errors.confirmPassword?.message}
                  />
                )}
              />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(400).duration(360)}>
              <Controller
                control={control}
                name="acceptTerms"
                render={({ field: { onChange, value } }) => (
                  <Pressable
                    onPress={() => {
                      haptics.selection();
                      onChange(!value);
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'flex-start',
                      gap: 10,
                      marginVertical: 4
                    }}
                  >
                    <View
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 8,
                        borderWidth: 2,
                        borderColor: value ? theme.colors.primary : theme.colors.border,
                        backgroundColor: value ? theme.colors.primary : 'transparent',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginTop: 2
                      }}
                    >
                      {value ? <Ionicons name="checkmark" size={16} color="#FFF" /> : null}
                    </View>
                    <AppText variant="muted" style={{ flex: 1 }}>
                      I agree to Choner's Terms, Privacy Policy, and Health Disclaimer.
                    </AppText>
                  </Pressable>
                )}
              />
              {errors.acceptTerms ? (
                <AppText variant="caption" style={{ color: theme.colors.danger }}>
                  {errors.acceptTerms.message as string}
                </AppText>
              ) : null}
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(460).duration(360)}>
              <Button
                label={loading ? 'Creating…' : 'Create account'}
                variant="gradient"
                loading={loading}
                onPress={onSubmit}
                size="lg"
              />
            </Animated.View>

            <Animated.View
              entering={FadeInDown.delay(520).duration(360)}
              style={{ marginTop: 8, flexDirection: 'row', justifyContent: 'center', gap: 6 }}
            >
              <AppText variant="muted">Already have an account?</AppText>
              <Link href="/(auth)/sign-in">
                <AppText
                  style={{ color: theme.colors.primary2, fontFamily: theme.fonts.bodyBold }}
                >
                  Sign in
                </AppText>
              </Link>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </AuroraBackground>
  );
}
