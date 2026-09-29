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
import {
  AuthCenteredHeader,
  FieldLabel,
  authInputBox
} from '@/components/auth/AuthFormParts';
import { updatePassword } from '@/features/auth/api';
import { ResetPasswordInput, resetPasswordSchema } from '@/features/auth/schema';
import { theme } from '@/constants/theme';
import { notify } from '@/lib/alert';

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
      notify('Password updated', 'You are signed in with your new password.');
      // Back to the index gate rather than straight to Home: someone can reset
      // their password before finishing onboarding, and only the gate knows
      // which of the two they should land on.
      router.replace('/');
    } catch (error: any) {
      notify('Could not update password', error.message);
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
          <Animated.View entering={FadeInDown.delay(80).duration(360)}>
            <AuthCenteredHeader
              title="Set new password"
              helper="Pick something memorable, at least 8 characters."
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(180).duration(360)} style={styles.field}>
            <FieldLabel>New password</FieldLabel>
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, value } }) => (
                <Input
                  placeholder="••••••••"
                  boxStyle={authInputBox}
                  secureToggle
                  autoComplete="new-password"
                  value={value}
                  onChangeText={onChange}
                  error={errors.password?.message}
                />
              )}
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(240).duration(360)} style={styles.field}>
            <FieldLabel>Confirm new password</FieldLabel>
            <Controller
              control={control}
              name="confirmPassword"
              render={({ field: { onChange, value } }) => (
                <Input
                  placeholder="••••••••"
                  boxStyle={authInputBox}
                  secureToggle
                  autoComplete="new-password"
                  value={value}
                  onChangeText={onChange}
                  error={errors.confirmPassword?.message}
                />
              )}
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(320).duration(360)}>
            <Button
              label={loading ? 'Saving…' : 'Save password'}
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
  content: { flexGrow: 1, padding: 20, gap: 18, paddingTop: 40 },
  field: { gap: 9 }
});
