import { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/button';
import { KeyboardScroll } from '@/components/ui/keyboard';
import { TopBarPill, useTopBarClearance } from '@/components/navigation/AppTopBar';
import { useSession } from '@/providers/session-provider';
import { claimFirstTwoHundred } from '@/features/profile/api';
import { theme } from '@/constants/theme';
import { haptics } from '@/lib/haptics';

/* ONE field, not two (FIRST_200_BUILD_SPEC 7.1, decided 14 October).
 *
 * The same box takes a First 200 access code today and can take whatever we
 * add later, because claim_prelaunch already matches either an access_code or
 * a claim_token. Asking someone "what kind of code is this?" before they have
 * typed it is a question only we care about.
 *
 * This screen is the FALLBACK. Anyone who signed up with the address they
 * registered with was linked on email verification and never gets here: the
 * row that opens it is hidden once is_first_200 is true.
 */
export default function FirstTwoHundredCodeScreen() {
  const clearance = useTopBarClearance();
  const queryClient = useQueryClient();
  const { session } = useSession();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [welcome, setWelcome] = useState<string | null>(null);

  const onClaim = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await claimFirstTwoHundred(code);
      if (!result.ok) {
        haptics.error();
        setError(result.message);
        return;
      }
      haptics.success();
      // The profile carries is_first_200, and Profile reads it to decide
      // whether to show the pill and hide the row that got us here.
      await queryClient.invalidateQueries({ queryKey: ['profile', session?.user.id] });
      setWelcome(result.firstName);
    } finally {
      setBusy(false);
    }
  };

  if (welcome !== null) {
    return (
      <SafeAreaView style={styles.root} edges={['bottom', 'left', 'right']}>
        <TopBarPill title="The First 200" />
        <ScrollView contentContainerStyle={[styles.content, { paddingTop: clearance }]}>
          <Animated.View entering={FadeInDown.duration(360)} style={styles.okBlock}>
            <View style={styles.tick}>
              <AppText style={styles.tickMark}>✓</AppText>
            </View>
            <AppText style={styles.okTitle}>There you are{welcome ? `, ${welcome}` : ''}.</AppText>
            <AppText style={styles.okSub}>
              You're one of The First 200. Nothing else to do.
            </AppText>
          </Animated.View>
          {/* Back to where they came from, not a dead end. The recognition is
              on Profile by the time they land. */}
          <Button label="Done" onPress={() => router.back()} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['bottom', 'left', 'right']}>
      <TopBarPill title="Have a code?" />
      <KeyboardScroll contentContainerStyle={[styles.content, { paddingTop: clearance }]}>
        <AppText style={styles.eyebrow}>THE FIRST 200</AppText>
        <AppText style={styles.title}>
          Enter your <AppText style={styles.emphasis}>code</AppText>
        </AppText>
        <AppText style={styles.sub}>
          If you joined The First 200 with a different email address, this is how we find you.
        </AppText>

        <AppText style={styles.label}>Your code</AppText>
        <TextInput
          value={code}
          onChangeText={(v) => {
            setCode(v.toUpperCase());
            if (error) setError(null);
          }}
          placeholder="F2-ABC123"
          placeholderTextColor={theme.colors.dim}
          autoCapitalize="characters"
          autoCorrect={false}
          spellCheck={false}
          returnKeyType="go"
          onSubmitEditing={() => void onClaim()}
          editable={!busy}
          style={[styles.input, error ? styles.inputBad : null]}
          accessibilityLabel="Your First 200 code"
        />
        {error ? <AppText style={styles.error}>{error}</AppText> : (
          <AppText style={styles.hint}>
            It's on the screen you saw after joining, and in the email we sent.
          </AppText>
        )}

        <View style={styles.foot}>
          <Button label="Claim my place" loading={busy} disabled={busy || code.trim().length < 3} onPress={onClaim} />
          <Button label="I don't have one" variant="ghost" onPress={() => router.back()} />
        </View>
      </KeyboardScroll>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  content: { paddingHorizontal: 22, paddingBottom: theme.spacing(4), flexGrow: 1 },
  eyebrow: {
    fontFamily: theme.fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1,
    color: theme.colors.muted,
    textTransform: 'uppercase',
    marginBottom: 8
  },
  title: { fontFamily: theme.fonts.body, fontSize: 25, color: theme.colors.text, marginBottom: 8 },
  emphasis: { fontFamily: theme.fonts.bodyBold, color: theme.colors.primary2 },
  sub: { fontSize: 13.5, lineHeight: 21, color: theme.colors.muted, marginBottom: 26 },
  label: { fontFamily: theme.fonts.bodyMedium, fontSize: 12.5, color: theme.colors.text, marginBottom: 9 },
  input: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 15,
    fontSize: 19,
    letterSpacing: 2,
    color: theme.colors.text,
    ...theme.shadow.sm
  },
  inputBad: { borderColor: theme.colors.danger },
  hint: { fontSize: 12, lineHeight: 18, color: theme.colors.muted, marginTop: 10 },
  error: { fontSize: 12.5, lineHeight: 19, color: theme.colors.danger, marginTop: 10 },
  foot: { marginTop: 'auto', paddingTop: 28, gap: 10 },
  okBlock: { alignItems: 'center', gap: 12, marginTop: theme.spacing(4), marginBottom: 'auto' },
  tick: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: theme.colors.primary2,
    alignItems: 'center',
    justifyContent: 'center'
  },
  tickMark: { color: '#FFFFFF', fontSize: 34, lineHeight: 40 },
  okTitle: { fontFamily: theme.fonts.bodyBold, fontSize: 22, color: theme.colors.text, textAlign: 'center' },
  okSub: { fontSize: 14, lineHeight: 21, color: theme.colors.muted, textAlign: 'center', maxWidth: 280 }
});
