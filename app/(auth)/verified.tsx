import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/Icon';
import { getPendingInviteToken } from '@/lib/pending-invite';
import { theme } from '@/constants/theme';

// Where someone lands after tapping the link in their verification email.
//
// By the time this renders the session exists: components/auth/AuthLinkHandler
// reads the tokens out of the link, creates the session, and only then routes
// here. An expired or already-used link goes to link-expired.tsx instead.
export default function VerifiedScreen() {
  const [inviteToken, setInviteToken] = useState<string | null>(null);

  // Someone can enter an invite code and only then create an account. If they
  // did, the code is waiting in storage and is the thing they came for.
  useEffect(() => {
    getPendingInviteToken().then(setInviteToken);
  }, []);

  const onContinue = () => {
    if (inviteToken) {
      router.replace({ pathname: '/invite/[token]', params: { token: inviteToken } });
      return;
    }
    // Always onboarding otherwise: verifying an email only ever happens right
    // after sign-up, so the profile is never complete at this point.
    router.replace('/onboarding');
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.body}>
        <Animated.View entering={FadeInDown.duration(360)} style={styles.hero}>
          <View style={styles.mark}>
            <Icon name="check" size={36} color="#FFFFFF" strokeWidth={2.6} />
          </View>
          <AppText style={styles.title}>
            You're <AppText style={[styles.title, styles.titleBold]}>verified.</AppText>
          </AppText>
          <AppText variant="caption" muted style={styles.helper}>
            Your email is confirmed and you're signed in.
          </AppText>
        </Animated.View>
      </View>

      <Animated.View entering={FadeInDown.delay(180).duration(360)} style={styles.footer}>
        <Button label="Continue" variant="gradient" size="lg" onPress={onContinue} />
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  body: { flex: 1, justifyContent: 'center', paddingHorizontal: 20 },
  hero: { alignItems: 'center', gap: theme.spacing(1.5) },
  mark: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing(1),
    ...theme.shadow.glow
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
  footer: { padding: 20 }
});
