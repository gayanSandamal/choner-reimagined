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
import { previewInvite } from '@/features/community/api';
import { useProfile } from '@/features/profile/hooks';
import { setPendingInviteToken, clearPendingInviteToken } from '@/lib/pending-invite';
import { theme } from '@/constants/theme';

type Phase = 'idle' | 'accepting' | 'confirm-replace' | 'success' | 'error' | 'needs-auth';

export default function AcceptInviteScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { session, loading } = useSession();
  const acceptInvite = useAcceptInvite();
  const profileQ = useProfile(session?.user.id);
  const [phase, setPhase] = useState<Phase>('idle');
  const [message, setMessage] = useState('');
  // Filled when accepting would replace the challenge they are already on.
  const [replace, setReplace] = useState<{ from: string; to: string | null; inviter: string } | null>(null);
  const startedRef = useRef(false);

  const accept = () => {
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
  };

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
    // Signed in, but which kind of account decides where this goes, so wait
    // for the profile before doing anything.
    if (profileQ.isLoading) return;
    if (startedRef.current) return;

    // A NEW account has answered nothing yet: no goal, struggle, style, age,
    // gender or energy, which is everything matching and the app's tone run
    // on. Accepting here used to drop them on Home with an empty profile. So
    // keep the invite, send them through onboarding, and let it be accepted
    // the moment the quiz saves (PendingInviteHandler in app/_layout.tsx).
    // The photo step then skips the challenge picker, because they inherit
    // their partner's challenge, and they finish on the why.
    //
    // Fails open: no profile row (a read error) is treated as an existing
    // account rather than trapping someone in onboarding.
    if (profileQ.data && !profileQ.data.onboarding_complete) {
      startedRef.current = true;
      setPendingInviteToken(String(token)).then(() => router.replace('/onboarding'));
      return;
    }

    startedRef.current = true;
    setPhase('accepting');

    // An EXISTING account may already be on a challenge, and accepting swaps
    // it for the inviter's. That used to happen without a word. Ask first:
    // the preview says what accepting would do and changes nothing itself.
    // If the preview fails for any reason, fall through to accepting: the
    // RPC has its own checks and its own messages.
    previewInvite(String(token))
      .then((pv) => {
        if (pv.found && pv.replaces && !pv.mine && !pv.blocked && !pv.expired) {
          setReplace({ from: pv.replaces, to: pv.activity, inviter: pv.inviter_first_name });
          setPhase('confirm-replace');
          return;
        }
        accept();
      })
      .catch(() => accept());
  }, [loading, session, token, profileQ.isLoading, profileQ.data]);

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
              Your shared fire is lit. You and your partner are in this together now.
            </AppText>
            {/* Only an EXISTING account reaches this: a new one is sent
                through onboarding above. They answer their own "Why" before
                landing on Home. The screen seeds itself from anything they
                already answered and can be skipped, so accepting a second
                invite does not mean redoing it. */}
            <Button label="Continue" onPress={() => router.replace('/challenge/why')} />
          </>
        ) : phase === 'confirm-replace' && replace ? (
          <>
            <Ionicons name="swap-horizontal" size={52} color={theme.colors.primary2} />
            <AppText variant="title" style={styles.textCenter}>
              Switch to {replace.inviter}'s challenge?
            </AppText>
            <AppText variant="muted" style={styles.textCenter}>
              You're on {replace.from}. Joining {replace.inviter} replaces it
              {replace.to ? ` with ${replace.to}` : ''}, and your progress on {replace.from} ends here.
            </AppText>
            <Button label={`Join ${replace.inviter}`} onPress={accept} />
            <Button
              label="Keep my challenge"
              variant="ghost"
              onPress={() => {
                // Saying no is not an error and must not be asked again on the
                // next launch.
                clearPendingInviteToken();
                router.replace('/(tabs)/home');
              }}
            />
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
