import { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/ui/StateViews';
import { useSession } from '@/providers/session-provider';
import { useAcceptInvite } from '@/features/community/hooks';
import { setPendingInviteToken, clearPendingInviteToken } from '@/lib/pending-invite';
import { theme } from '@/constants/theme';

type Phase = 'idle' | 'accepting' | 'success' | 'error' | 'needs-auth';

export default function AcceptInviteScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { session, loading } = useSession();
  const acceptInvite = useAcceptInvite();
  const [phase, setPhase] = useState<Phase>('idle');
  const [message, setMessage] = useState('');
  const startedRef = useRef(false);

  useEffect(() => {
    if (loading) return;
    if (!token) {
      setPhase('error');
      setMessage('This invite link is missing its code.');
      return;
    }
    if (!session) {
      // Stash it so it survives the sign-in redirect, then accept post-auth.
      setPendingInviteToken(String(token));
      setPhase('needs-auth');
      return;
    }
    if (startedRef.current) return;
    startedRef.current = true;
    setPhase('accepting');
    acceptInvite
      .mutateAsync(String(token))
      .then(() => {
        clearPendingInviteToken();
        setPhase('success');
      })
      .catch((e: any) => {
        setPhase('error');
        setMessage(e?.message ?? 'Could not accept this invite.');
      });
  }, [loading, session, token]);

  return (
    <Screen>
      <View style={styles.center}>
        {phase === 'accepting' || phase === 'idle' ? (
          <LoadingState label="Joining the challenge…" />
        ) : phase === 'success' ? (
          <>
            <Ionicons name="flame" size={56} color={theme.colors.primary} />
            <AppText variant="title" style={styles.textCenter}>
              You're in!
            </AppText>
            <AppText variant="muted" style={styles.textCenter}>
              Your shared fire is lit — you and your partner are in this together now.
            </AppText>
            {/* Step 4: the partner who joined answers their own "Why" before
                landing on Home. The screen seeds itself from anything they
                already answered and can be skipped, so an existing user
                accepting a second invite isn't made to redo it. */}
            <Button label="Continue" onPress={() => router.replace('/onboarding/why')} />
          </>
        ) : phase === 'needs-auth' ? (
          <>
            <Ionicons name="people" size={52} color={theme.colors.primary2} />
            <AppText variant="title" style={styles.textCenter}>
              One step first
            </AppText>
            <AppText variant="muted" style={styles.textCenter}>
              Sign in or create your account and we'll pull you straight into the challenge.
            </AppText>
            <Button label="Continue" onPress={() => router.replace('/(auth)/welcome')} />
          </>
        ) : (
          <>
            <Ionicons name="alert-circle-outline" size={52} color={theme.colors.danger} />
            <AppText variant="title" style={styles.textCenter}>
              That didn't work
            </AppText>
            <AppText variant="muted" style={styles.textCenter}>
              {message}
            </AppText>
            <Button
              label={session ? 'Go home' : 'Back to sign in'}
              onPress={() => router.replace(session ? '/(tabs)/home' : '/(auth)/welcome')}
            />
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing(2),
    paddingHorizontal: theme.spacing(2)
  },
  textCenter: { textAlign: 'center' }
});
