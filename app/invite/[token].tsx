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
import {
  InviteRefusal,
  inviteRefusalFromError,
  inviteRefusalFromPreview,
  previewInvite
} from '@/features/community/api';
import { useProfile } from '@/features/profile/hooks';
import { setPendingInviteToken, clearPendingInviteToken } from '@/lib/pending-invite';
import { theme } from '@/constants/theme';

type Phase = 'idle' | 'accepting' | 'confirm-replace' | 'success' | 'closed' | 'error' | 'needs-auth';

// An invite works once (10 Nov 2026). Every way it cannot be used gets its own
// plain screen, and none of them changes anything.
const CLOSED: Record<InviteRefusal, { icon: keyof typeof Ionicons.glyphMap; title: string; body: string }> = {
  already_joined: {
    icon: 'checkmark-circle-outline',
    title: 'You already joined',
    body: 'You joined this challenge with this invite, so the link has been used. Nothing has changed.'
  },
  used: {
    icon: 'lock-closed-outline',
    title: 'This invite has been used',
    body: 'Someone has already joined with it. Ask for a new invite if you want to join.'
  },
  expired: {
    icon: 'time-outline',
    title: 'This invite has expired',
    body: 'Invites last 48 hours. Ask them to send you a new one.'
  },
  own: {
    icon: 'person-outline',
    title: 'This is your own invite',
    body: 'Send it to the person you want to do this with.'
  },
  not_found: {
    icon: 'help-circle-outline',
    title: 'This invite link does not work',
    body: 'Check the code in the message, or ask them to send a new invite.'
  },
  you_partnered: {
    icon: 'people-outline',
    title: 'You already have a partner',
    body: 'Your challenge and your partner stay as they are. End that match first if you want to join someone else.'
  },
  match_waiting: {
    icon: 'hourglass-outline',
    title: 'You have a match waiting',
    body: 'Answer the match on Find first. Your challenge stays as it is.'
  },
  they_partnered: {
    icon: 'people-outline',
    title: 'This invite is no longer available',
    body: 'They have paired up with someone else.'
  }
};

export default function AcceptInviteScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { session, loading } = useSession();
  const acceptInvite = useAcceptInvite();
  const profileQ = useProfile(session?.user.id);
  const [phase, setPhase] = useState<Phase>('idle');
  const [message, setMessage] = useState('');
  // Filled when accepting would replace the challenge they are already on.
  const [replace, setReplace] = useState<{ from: string; to: string | null; inviter: string } | null>(null);
  const [closed, setClosed] = useState<InviteRefusal | null>(null);

  // Refused: say why, change nothing, and forget the stashed link so it is not
  // tried again on the next launch.
  const close = (why: InviteRefusal) => {
    clearPendingInviteToken();
    setClosed(why);
    setPhase('closed');
  };
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
        const why = inviteRefusalFromError(e);
        if (why) return close(why);
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
        // Used, expired, yours, or you are already paired: stop here. This is
        // what keeps a second tap on a used link from joining all over again.
        const why = inviteRefusalFromPreview(pv);
        if (why) return close(why);
        if (pv.found && pv.replaces) {
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
        ) : phase === 'closed' && closed ? (
          <>
            <Ionicons name={CLOSED[closed].icon} size={52} color={theme.colors.primary2} />
            <AppText variant="title" style={styles.textCenter}>
              {CLOSED[closed].title}
            </AppText>
            <AppText variant="muted" style={styles.textCenter}>
              {CLOSED[closed].body}
            </AppText>
            <Button label="Go home" onPress={() => router.replace('/(tabs)/home')} />
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
