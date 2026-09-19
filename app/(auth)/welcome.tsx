import { Image, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/button';
import { AppText } from '@/components/ui/AppText';
import { TermsFooter } from '@/components/auth/TermsFooter';
import { theme } from '@/constants/theme';

const logo = require('../../assets/choner-logo.png');

export default function WelcomeScreen() {
  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.spacer} />
      <Animated.View entering={FadeInDown.delay(80).duration(360)} style={styles.brand}>
        <Image source={logo} style={styles.logo} resizeMode="contain" accessibilityLabel="Choner logo" />
        <View style={styles.copy}>
          <AppText style={styles.headline}>
            {'Turn "I should"\n'}
            <AppText style={[styles.headline, styles.headlineEmphasis]}>{'into "I did"'}</AppText>
          </AppText>
          <AppText variant="caption" muted style={styles.tagline}>
            Somewhere, someone is counting on you to show up.
          </AppText>
        </View>
      </Animated.View>
      <View style={styles.spacer} />

      <View style={styles.actions}>
        <Animated.View entering={FadeInDown.delay(200).duration(360)}>
          <Button
            label="SIGN IN"
            variant="primary"
            pill
            size="lg"
            leftIcon={<Ionicons name="log-in-outline" size={20} color="#FFF" />}
            onPress={() => router.push('/(auth)/sign-in')}
          />
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(280).duration(360)}>
          <Button
            label="SIGN UP"
            variant="outline"
            pill
            size="lg"
            leftIcon={
              <Ionicons name="person-add-outline" size={18} color={theme.colors.primary} />
            }
            onPress={() => router.push('/(auth)/sign-up')}
          />
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(360).duration(360)}>
          {/* Invitees arrive here when the deep link can't open (no app yet),
              so give them a way in that doesn't depend on the link. */}
          <Button
            label="I have an invite code"
            variant="ghost"
            onPress={() => router.push('/invite/code')}
          />
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(420).duration(360)}>
          <TermsFooter />
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.bg,
    paddingHorizontal: 20
  },
  spacer: { flex: 1 },
  brand: { alignItems: 'center', gap: 20 },
  logo: { width: 150, height: 102 },
  copy: { alignItems: 'center', gap: 8 },
  headline: {
    fontFamily: theme.fonts.display,
    fontSize: 25,
    lineHeight: 32,
    letterSpacing: -0.5,
    color: theme.colors.text,
    textAlign: 'center'
  },
  headlineEmphasis: { fontFamily: theme.fonts.bodyBold, color: theme.colors.primary2 },
  tagline: { textAlign: 'center', fontSize: 13.5, lineHeight: 21, maxWidth: 260 },
  actions: {
    gap: 18,
    paddingBottom: theme.spacing(2)
  }
});
