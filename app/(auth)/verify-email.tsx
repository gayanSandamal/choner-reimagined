import { useState } from 'react';
import { Alert, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { BrandMark } from '@/components/auth/BrandMark';
import { resendVerification } from '@/features/auth/api';
import { theme } from '@/constants/theme';

export default function VerifyEmailScreen() {
  const { email } = useLocalSearchParams<{ email?: string }>();
  const [loading, setLoading] = useState(false);

  const onResend = async () => {
    if (!email) return;
    try {
      setLoading(true);
      await resendVerification(email);
      Alert.alert('Sent', 'A new verification email is on its way.');
    } catch (e: any) {
      Alert.alert('Could not resend', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <Animated.View entering={FadeInDown.delay(80).duration(360)} style={styles.header}>
          <BrandMark width={150} />
          <AppText style={styles.heading}>CHECK YOUR EMAIL</AppText>
          <AppText variant="muted" style={styles.helper}>
            We sent a verification link to {email ?? 'your inbox'}. Tap it to finish creating
            your account.
          </AppText>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(180).duration(360)}>
          <Button
            label={loading ? 'SENDING…' : 'RESEND EMAIL'}
            variant="primary"
            pill
            size="lg"
            loading={loading}
            disabled={loading || !email}
            leftIcon={<Ionicons name="mail-outline" size={20} color="#FFF" />}
            onPress={onResend}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(260).duration(360)}>
          <Button
            label="BACK TO SIGN IN"
            variant="outline"
            pill
            size="lg"
            leftIcon={
              <Ionicons name="log-in-outline" size={18} color={theme.colors.primary} />
            }
            labelStyle={{ fontFamily: theme.fonts.displayItalic }}
            onPress={() => router.replace('/(auth)/sign-in')}
          />
        </Animated.View>
      </ScrollView>
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
