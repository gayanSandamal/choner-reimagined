import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
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
            <AppText style={styles.heading}>WELCOME BACK</AppText>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(160).duration(360)}>
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
                  autoComplete="email"
                  keyboardType="email-address"
                  value={value}
                  onChangeText={onChange}
                  error={errors.email?.message}
                />
              )}
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(220).duration(360)}>
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, value } }) => (
                <Input
                  placeholder="ENTER PASSWORD"
                  pill
                  secureToggle
                  leftIcon={
                    <Ionicons
                      name="lock-closed-outline"
                      size={20}
                      color={theme.colors.accent}
                    />
                  }
                  autoComplete="password"
                  value={value}
                  onChangeText={onChange}
                  error={errors.password?.message}
                />
              )}
            />
          </Animated.View>

          {formError ? (
            <Animated.View entering={FadeInDown.duration(240)}>
              <AppText style={styles.formError}>{formError}</AppText>
            </Animated.View>
          ) : null}

          <Animated.View entering={FadeInDown.delay(280).duration(360)}>
            <Button
              label={loading ? 'SIGNING IN…' : 'SIGN IN'}
              variant="primary"
              pill
              size="lg"
              loading={loading}
              leftIcon={<Ionicons name="log-in-outline" size={20} color="#FFF" />}
              onPress={onSubmit}
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(340).duration(360)}>
            <Pressable
              hitSlop={8}
              onPress={() => router.push('/(auth)/forgot-password')}
              style={styles.forgotWrap}
              accessibilityRole="link"
            >
              <AppText style={styles.forgot}>FORGOT PASSWORD</AppText>
            </Pressable>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(400).duration(360)} style={styles.bottom}>
            <Button
              label="SIGN UP"
              variant="outline"
              pill
              size="lg"
              leftIcon={
                <Ionicons
                  name="person-add-outline"
                  size={18}
                  color={theme.colors.primary}
                />
              }
              onPress={() => router.push('/(auth)/sign-up')}
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
  formError: {
    color: theme.colors.danger,
    fontFamily: theme.fonts.body,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center'
  },
  forgotWrap: { alignSelf: 'center' },
  forgot: {
    color: theme.colors.muted,
    fontFamily: theme.fonts.bodyBold,
    fontSize: 13,
    letterSpacing: 1,
    textDecorationLine: 'underline',
    textTransform: 'uppercase'
  },
  bottom: { marginTop: 'auto', paddingTop: 12 }
});
