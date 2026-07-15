import { useState } from 'react';
import {
  Alert,
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
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/ui/text';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AuthBackButton } from '@/components/auth/AuthBackButton';
import { BrandMark } from '@/components/auth/BrandMark';
import { requestPasswordReset } from '@/features/auth/api';
import { ForgotPasswordInput, forgotPasswordSchema } from '@/features/auth/schema';
import { theme } from '@/constants/theme';

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
      Alert.alert('Check your email', 'We sent you a link to reset your password.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert('Could not send reset email', error.message);
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

          <Animated.View entering={FadeInDown.delay(80).duration(360)} style={styles.header}>
            <BrandMark width={150} />
            <AppText style={styles.heading}>FORGOT PASSWORD</AppText>
            <AppText variant="muted" style={styles.helper}>
              Enter your email and we'll send a link to set a new password.
            </AppText>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(180).duration(360)}>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, value } }) => (
                <Input
                  placeholder="ENTER EMAIL"
                  pill
                  leftIcon={
                    <Ionicons name="mail-outline" size={20} color={theme.colors.accent} />
                  }
                  autoCapitalize="none"
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
              label={loading ? 'SENDING…' : 'SEND RESET LINK'}
              variant="primary"
              pill
              size="lg"
              loading={loading}
              leftIcon={<Ionicons name="mail-outline" size={20} color="#FFF" />}
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
  header: { alignItems: 'center', gap: 10 },
  heading: {
    fontFamily: theme.fonts.display,
    fontSize: 16,
    letterSpacing: 1.5,
    textAlign: 'center',
    textTransform: 'uppercase'
  },
  helper: { textAlign: 'center' }
});
