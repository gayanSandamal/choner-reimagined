import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View
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
import { signUp, authErrorMessage } from '@/features/auth/api';
import { SignUpInput, signUpSchema } from '@/features/auth/schema';
import { theme } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import { notify } from '@/lib/alert';

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
            <AppText style={styles.heading}>CREATE ACCOUNT</AppText>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(160).duration(360)}>
            <Controller
              control={control}
              name="fullName"
              render={({ field: { onChange, value } }) => (
                <Input
                  placeholder="ENTER FULL NAME"
                  pill
                  leftIcon={
                    <Ionicons name="person-outline" size={20} color={theme.colors.accent} />
                  }
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
                  placeholder="ENTER EMAIL"
                  pill
                  leftIcon={
                    <Ionicons name="mail-outline" size={20} color={theme.colors.accent} />
                  }
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
                  placeholder="CONFIRM PASSWORD"
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
              label={loading ? 'CREATING…' : 'SIGN UP'}
              variant="primary"
              pill
              size="lg"
              loading={loading}
              leftIcon={<Ionicons name="person-add-outline" size={20} color="#FFF" />}
              onPress={onSubmit}
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(520).duration(360)} style={styles.bottom}>
            <Button
              label="SIGN IN"
              variant="outline"
              pill
              size="lg"
              leftIcon={
                <Ionicons name="log-in-outline" size={18} color={theme.colors.primary} />
              }
              onPress={() => router.push('/(auth)/sign-in')}
            />
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  content: { flexGrow: 1, padding: 20, gap: 16 },
  header: { alignItems: 'center', gap: 10 },
  heading: {
    fontFamily: theme.fonts.display,
    fontSize: 16,
    letterSpacing: 1.5,
    textAlign: 'center',
    textTransform: 'uppercase'
  },
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
  bottom: { marginTop: 'auto', paddingTop: 12 }
});
