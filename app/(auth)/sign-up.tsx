import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/ui/AppText';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AuthTopBar } from '@/components/auth/AuthTopBar';
import { AuthHeading, AuthSwitchLink, FieldLabel, authInputBox } from '@/components/auth/AuthFormParts';
import { signUp, authErrorMessage } from '@/features/auth/api';
import { SignUpInput, signUpSchema } from '@/features/auth/schema';
import { theme } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import { notify } from '@/lib/alert';

// Each document is its own link inside the tick-box label. `onPress` on a
// nested Text stops the tap reaching the row, so opening a document does not
// also toggle consent.
function LegalLink({ to, children }: { to: LegalRoute; children: string }) {
  return (
    <AppText
      variant="caption"
      style={styles.legalLink}
      onPress={() => router.push(to)}
      accessibilityRole="link"
    >
      {children}
    </AppText>
  );
}

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
      notify('Sign up failed', authErrorMessage(error));
    } finally {
      setLoading(false);
    }
  });

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <AuthTopBar title="Create account" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Animated.View entering={FadeInDown.duration(360)}>
            <AuthHeading lead="Let's get " emphasis="started" />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(60).duration(360)} style={styles.field}>
            <FieldLabel>Your name</FieldLabel>
            <Controller
              control={control}
              name="fullName"
              render={({ field: { onChange, value } }) => (
                <Input
                  placeholder="Your full name"
                  boxStyle={authInputBox}
                  autoComplete="name"
                  value={value}
                  onChangeText={onChange}
                  error={errors.fullName?.message}
                />
              )}
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(110).duration(360)} style={styles.field}>
            <FieldLabel>Email</FieldLabel>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, value } }) => (
                <Input
                  placeholder="you@email.com"
                  boxStyle={authInputBox}
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

          <Animated.View entering={FadeInDown.delay(160).duration(360)} style={styles.field}>
            <FieldLabel>Password</FieldLabel>
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, value } }) => (
                <Input
                  placeholder="••••••••"
                  boxStyle={authInputBox}
                  secureToggle
                  value={value}
                  onChangeText={onChange}
                  error={errors.password?.message}
                />
              )}
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(210).duration(360)} style={styles.field}>
            <FieldLabel>Confirm password</FieldLabel>
            <Controller
              control={control}
              name="confirmPassword"
              render={({ field: { onChange, value } }) => (
                <Input
                  placeholder="••••••••"
                  boxStyle={authInputBox}
                  secureToggle
                  value={value}
                  onChangeText={onChange}
                  error={errors.confirmPassword?.message}
                />
              )}
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(260).duration(360)}>
            <Controller
              control={control}
              name="acceptTerms"
              render={({ field: { onChange, value } }) => (
                <Pressable
                  onPress={() => {
                    haptics.selection();
                    onChange(!value);
                  }}
                  style={styles.termsRow}
                >
                  <View
                    style={[
                      styles.checkbox,
                      {
                        borderColor: value ? theme.colors.primary : theme.colors.border,
                        backgroundColor: value ? theme.colors.primary : 'transparent'
                      }
                    ]}
                  >
                    {value ? <Ionicons name="checkmark" size={16} color="#FFF" /> : null}
                  </View>
                  {/* The only place the agreement appears. The bottom legal
                      line is gone from every screen: this tick box is what
                      records consent, so it is also what carries the links. */}
                  <AppText variant="caption" muted style={{ flex: 1 }}>
                    I agree to Choner's <LegalLink to="/legal/terms">Terms of use</LegalLink>,{' '}
                    <LegalLink to="/legal/privacy">Privacy policy</LegalLink>,{' '}
                    {/* No cookie policy screen exists yet; cookies are covered
                        inside Privacy until one is written. */}
                    <LegalLink to="/legal/privacy">Cookie policy</LegalLink> and{' '}
                    <LegalLink to="/legal/health-disclaimer">Health disclaimer</LegalLink>.
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

          <Animated.View entering={FadeInDown.delay(310).duration(360)} style={styles.bottom}>
            <Button
              label={loading ? 'Creating…' : 'Create account'}
              variant="gradient"
              size="lg"
              loading={loading}
              style={styles.button}
              onPress={onSubmit}
            />
            <AuthSwitchLink
              prompt="Already have one?"
              action="Log in"
              onPress={() => router.replace('/(auth)/sign-in')}
            />
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

type LegalRoute = '/legal/terms' | '/legal/privacy' | '/legal/health-disclaimer';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  legalLink: { color: theme.colors.link, textDecorationLine: 'underline' },
  content: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16, gap: 12 },
  field: { gap: 10 },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginVertical: 4
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2
  },
  bottom: { marginTop: 'auto', paddingTop: 12 },
  button: { borderRadius: 18 }
});
