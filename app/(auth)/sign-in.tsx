import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppText } from '@/components/ui/AppText';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AuthTopBar } from '@/components/auth/AuthTopBar';
import { AuthHeading, AuthSwitchLink, FieldLabel, authInputBox } from '@/components/auth/AuthFormParts';
import { authErrorMessage, signIn } from '@/features/auth/api';
import { SignInInput, signInSchema } from '@/features/auth/schema';
import { theme } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import { notify } from '@/lib/alert';

export default function SignInScreen() {
  const [loading, setLoading] = useState(false);
  // Shown on the form itself. A toast can be missed or scroll away, and a
  // failed sign in is exactly the moment someone needs the reason in front of
  // them — including the possibility that they never made an account.
  const [formError, setFormError] = useState<string | null>(null);
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
      setFormError(null);
      await signIn(values);
      haptics.success();
      // Land on the index gate: it decides between onboarding and home
      // based on the profile's onboarding_complete flag.
      router.replace('/');
    } catch (error: any) {
      haptics.error();
      const message = authErrorMessage(error);
      setFormError(message);
      notify("Couldn't sign you in", message);
    } finally {
      setLoading(false);
    }
  });

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <AuthTopBar title="Log in" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Animated.View entering={FadeInDown.duration(360)}>
            <AuthHeading lead="Welcome " emphasis="back" sub="Someone's been waiting for you." />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(80).duration(360)} style={styles.field}>
            <FieldLabel>Email</FieldLabel>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, value } }) => (
                <Input
                  placeholder="you@email.com"
                  boxStyle={authInputBox}
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

          <Animated.View entering={FadeInDown.delay(140).duration(360)} style={styles.field}>
            <FieldLabel>Password</FieldLabel>
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, value } }) => (
                <Input
                  placeholder="••••••••"
                  boxStyle={authInputBox}
                  secureToggle
                  autoComplete="password"
                  value={value}
                  onChangeText={onChange}
                  error={errors.password?.message}
                />
              )}
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(180).duration(360)} style={styles.forgotRow}>
            <Pressable
              hitSlop={8}
              onPress={() => router.push('/(auth)/forgot-password')}
              accessibilityRole="link"
            >
              <AppText style={styles.forgot}>Forgot password?</AppText>
            </Pressable>
          </Animated.View>

          {formError ? (
            <Animated.View entering={FadeInDown.duration(240)}>
              <AppText style={styles.formError}>{formError}</AppText>
            </Animated.View>
          ) : null}

          <Animated.View entering={FadeInDown.delay(240).duration(360)} style={styles.bottom}>
            <Button
              label={loading ? 'Logging in…' : 'Log in'}
              variant="gradient"
              size="lg"
              loading={loading}
              style={styles.button}
              onPress={onSubmit}
            />
            <AuthSwitchLink
              prompt="New here?"
              action="Create an account"
              onPress={() => router.replace('/(auth)/sign-up')}
            />
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  content: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16, gap: 12 },
  field: { gap: 10 },
  forgotRow: { alignItems: 'flex-end', marginTop: -4 },
  forgot: { fontFamily: theme.fonts.bodyMedium, fontSize: 12.5, color: theme.colors.link },
  formError: {
    color: theme.colors.danger,
    fontFamily: theme.fonts.body,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center'
  },
  bottom: { marginTop: 'auto', paddingTop: 20 },
  button: { borderRadius: 18 }
});
