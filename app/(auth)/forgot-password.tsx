import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AuthBackButton } from '@/components/auth/AuthBackButton';
import {
  AuthCenteredHeader,
  FieldLabel,
  authInputBox
} from '@/components/auth/AuthFormParts';
import { requestPasswordReset } from '@/features/auth/api';
import { ForgotPasswordInput, forgotPasswordSchema } from '@/features/auth/schema';
import { theme } from '@/constants/theme';
import { notify } from '@/lib/alert';

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
      notify('Check your email', 'We sent you a link to reset your password.');
      router.back();
    } catch (error: any) {
      notify('Could not send reset email', error.message);
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
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View entering={FadeInDown.duration(360)}>
            <AuthBackButton />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(80).duration(360)}>
            <AuthCenteredHeader
              title="Forgot password"
              helper="Enter your email and we'll send a link to set a new password."
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(180).duration(360)} style={styles.field}>
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

          <Animated.View entering={FadeInDown.delay(260).duration(360)}>
            <Button
              label={loading ? 'Sending…' : 'Send reset link'}
              variant="gradient"
              size="lg"
              loading={loading}
              onPress={onSubmit}
            />
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  content: { flexGrow: 1, padding: 20, gap: 18 },
  field: { gap: 9 }
});
