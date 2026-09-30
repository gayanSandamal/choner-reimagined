import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Icon } from '@/components/ui/Icon';
import { FieldLabel, authInputBox } from '@/components/auth/AuthFormParts';
import { requestPasswordReset, resendVerification } from '@/features/auth/api';
import { ForgotPasswordInput, forgotPasswordSchema } from '@/features/auth/schema';
import { theme } from '@/constants/theme';
import { notify } from '@/lib/alert';

// A verification or reset link that has expired or was already used.
//
// It asks for the email because the link does not carry one. That is also why
// "Check your email" cannot offer Resend after a failed verification: there is
// nothing to resend to.
//
// TODO(gayan-deeplinks): route here when creating the session from the link
// fails because the token is expired or already consumed. Pass `kind` so the
// right link is sent, and `email` when the app still knows it.
export default function LinkExpiredScreen() {
  const { kind, email } = useLocalSearchParams<{ kind?: string; email?: string }>();
  const isReset = kind === 'reset';
  const [loading, setLoading] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: email ?? '' }
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      setLoading(true);
      if (isReset) {
        await requestPasswordReset(values.email);
        notify('Check your email', 'A new reset link is on its way.');
      } else {
        await resendVerification(values.email);
        notify('Check your email', 'A new verification link is on its way.');
      }
      router.replace('/(auth)/sign-in');
    } catch (error: any) {
      notify('Could not send a new link', error.message);
    } finally {
      setLoading(false);
    }
  });

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Animated.View entering={FadeInDown.duration(360)} style={styles.hero}>
            <View style={styles.mark}>
              <Icon name="clock" size={30} color={theme.colors.danger} />
            </View>
            <AppText style={styles.title}>
              This link has <AppText style={[styles.title, styles.titleBold]}>expired.</AppText>
            </AppText>
            <AppText variant="caption" muted style={styles.helper}>
              Links work once and only for a while. We'll send you a fresh one.
            </AppText>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(120).duration(360)} style={styles.field}>
            <FieldLabel>Your email</FieldLabel>
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

          <Animated.View entering={FadeInDown.delay(200).duration(360)} style={styles.actions}>
            <Button
              label={loading ? 'Sending…' : isReset ? 'Send a new reset link' : 'Send a new link'}
              variant="gradient"
              size="lg"
              loading={loading}
              onPress={onSubmit}
            />
            {/* Always available: a link that expired after the account was
                already verified means they can simply log in. */}
            <Button
              label="Back to sign in"
              variant="ghost"
              onPress={() => router.replace('/(auth)/sign-in')}
            />
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  content: { flexGrow: 1, padding: 20, paddingTop: 40, gap: 18 },
  hero: { alignItems: 'center', gap: theme.spacing(1) },
  mark: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${theme.colors.danger}1F`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing(1)
  },
  title: {
    fontFamily: theme.fonts.display,
    fontSize: 25,
    lineHeight: 32,
    letterSpacing: -0.5,
    color: theme.colors.text,
    textAlign: 'center'
  },
  titleBold: { fontFamily: theme.fonts.bodyBold },
  helper: { textAlign: 'center', fontSize: 13, lineHeight: 20 },
  field: { gap: 9 },
  actions: { marginTop: 'auto', gap: theme.spacing(1) }
});
