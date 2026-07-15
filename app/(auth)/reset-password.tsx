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
import { BrandMark } from '@/components/auth/BrandMark';
import { updatePassword } from '@/features/auth/api';
import { ResetPasswordInput, resetPasswordSchema } from '@/features/auth/schema';
import { theme } from '@/constants/theme';

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
      Alert.alert('Password updated', 'You are signed in with your new password.', [
        { text: 'Continue', onPress: () => router.replace('/(tabs)/home') },
      ]);
    } catch (error: any) {
      Alert.alert('Could not update password', error.message);
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
          <Animated.View entering={FadeInDown.delay(80).duration(360)} style={styles.header}>
            <BrandMark width={150} />
            <AppText style={styles.heading}>SET NEW PASSWORD</AppText>
            <AppText variant="muted" style={styles.helper}>
              Pick something memorable — at least 8 characters.
            </AppText>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(180).duration(360)}>
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, value } }) => (
                <Input
                  placeholder="ENTER NEW PASSWORD"
                  pill
                  secureToggle
                  leftIcon={
                    <Ionicons
                      name="lock-closed-outline"
                      size={20}
                      color={theme.colors.accent}
                    />
                  }
                  value={value}
                  onChangeText={onChange}
                  error={errors.password?.message}
                />
              )}
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(240).duration(360)}>
            <Controller
              control={control}
              name="confirmPassword"
              render={({ field: { onChange, value } }) => (
                <Input
                  placeholder="CONFIRM NEW PASSWORD"
                  pill
                  secureToggle
                  leftIcon={
                    <Ionicons
                      name="lock-closed-outline"
                      size={20}
                      color={theme.colors.accent}
                    />
                  }
                  value={value}
                  onChangeText={onChange}
                  error={errors.confirmPassword?.message}
                />
              )}
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(320).duration(360)}>
            <Button
              label={loading ? 'SAVING…' : 'SAVE PASSWORD'}
              variant="primary"
              pill
              size="lg"
              loading={loading}
              leftIcon={<Ionicons name="checkmark-circle-outline" size={20} color="#FFF" />}
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
