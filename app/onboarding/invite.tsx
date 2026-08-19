import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming
} from 'react-native-reanimated';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/input';
import { OptionCard } from '@/components/onboarding/OptionCard';
import { useOnboarding } from '@/features/onboarding/context';
import { useIsInvitee } from '@/features/onboarding/invitee';
import { challengeHabitTitle, setPartnerState } from '@/features/challenges/api';
import { useMyChallenge, useJoinMatchPool } from '@/features/challenges/hooks';
import { useCreateInvite, useResendInvite } from '@/features/community/hooks';
import { useSession } from '@/providers/session-provider';
import { useProfile } from '@/features/profile/hooks';
import { useReduceMotion } from '@/lib/motion';
import { buildInviteLink, shareInviteLink } from '@/lib/invite-link';
import { LoadingState } from '@/components/ui/StateViews';
import { captureError } from '@/lib/observability';
import { theme } from '@/constants/theme';
import { notify } from '@/lib/alert';

// Step 3 — how do you want to do this?
//
// Three real paths rather than one invite with a buried fallback. Invite and
// Find carry equal visual weight; Solo is deliberately lighter, because it is
// a valid choice but not the one that makes the product work.
type Phase = 'choose' | 'emailEntry' | 'pending' | 'finding';

const EMAIL_RE = /^\S+@\S+\.\S+$/;

export default function PartnerPathScreen() {
  const { session } = useSession();
  const userId = session?.user.id;
  const profileQ = useProfile(userId);
  const { chosenChallenge, startedChallengeId, setStartedChallengeId, sentInvite, setSentInvite } =
    useOnboarding();

  const challengeQ = useMyChallenge(userId);
  const createInvite = useCreateInvite();
  const resendInvite = useResendInvite();
  const joinPool = useJoinMatchPool();
  const { isInvitee, resolving } = useIsInvitee(userId);

  const [phase, setPhase] = useState<Phase>(sentInvite ? 'pending' : 'choose');
  const [email, setEmail] = useState('');
  // Seeded from context so a remount mid-onboarding doesn't strand the invite
  // with no way to share or resend it.
  const [lastToken, setLastToken] = useState<string | null>(sentInvite?.token ?? null);
  const [busy, setBusy] = useState(false);

  const challenge = challengeQ.data ?? null;
  const challengeId = startedChallengeId ?? challenge?.id ?? null;
  const habit = chosenChallenge?.title ?? challengeHabitTitle(challenge) ?? 'your challenge';

  // A habit someone wrote themselves has nobody else in the pool doing it, so
  // Find is not offered at all — with a reason, rather than a dead control.
  const isCustomHabit = Boolean(chosenChallenge?.customTitle ?? challenge?.custom_habit_title);

  // Someone who arrived through an invite already has a partner; they must
  // never be asked to find or invite one.
  useEffect(() => {
    if (isInvitee) router.replace('/onboarding/why');
  }, [isInvitee]);

  const onSendInvite = async () => {
    if (!userId || !EMAIL_RE.test(email) || !challengeId) return;
    setBusy(true);
    try {
      setStartedChallengeId(challengeId);
      const invite = await createInvite.mutateAsync({
        userChallengeId: challengeId,
        email: email.trim(),
        inviterId: userId,
        inviterName: profileQ.data?.full_name ?? undefined
      });
      await setPartnerState(challengeId, 'invited');
      setLastToken(invite.token ?? null);
      setSentInvite({ email: email.trim(), token: invite.token ?? null, emailed: invite.emailed });
      setPhase('pending');
      // No alert on a failed email: the pending state says so plainly and
      // offers the share link, which brings the partner in just as well. The
      // reason still needs to reach us, though, or delivery breaks silently.
      if (!invite.emailed) {
        captureError(new Error('Invite email not delivered'), {
          reason: invite.emailError,
          inviteId: invite.id
        });
      }
    } catch (error: any) {
      notify("The invite didn't send", error.message);
    } finally {
      setBusy(false);
    }
  };

  const onFindPartner = async () => {
    if (!challengeId) return;
    setBusy(true);
    try {
      await joinPool.mutateAsync({ userChallengeId: challengeId });
      setPhase('finding');
    } catch (error: any) {
      notify('Could not start looking', error.message);
    } finally {
      setBusy(false);
    }
  };

  const onShare = async () => {
    if (!lastToken) return;
    const how = await shareInviteLink(lastToken, profileQ.data?.full_name);
    if (how === 'copied') notify('Link copied', 'Paste it to your partner to bring them in.');
    if (how === 'failed') notify('Could not share', 'Copy the link shown above instead.');
  };

  const onResend = async () => {
    if (!sentInvite || !lastToken) return;
    try {
      await resendInvite.mutateAsync({
        email: sentInvite.email,
        token: lastToken,
        user_challenge_id: challengeId,
        inviterName: profileQ.data?.full_name ?? undefined
      });
      notify('Invite resent', `We sent another email to ${sentInvite.email}.`);
    } catch (error: any) {
      notify('Could not resend', error.message);
    }
  };

  const goHome = () => router.replace('/(tabs)/home');

  if (resolving || isInvitee || challengeQ.isLoading) {
    return (
      <SafeAreaView style={styles.root}>
        <LoadingState label="Setting up your challenge…" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View entering={FadeInDown.duration(360)} style={styles.header}>
          <AppText variant="label" muted>
            Your first challenge
          </AppText>
          {phase === 'finding' ? (
            <>
              <AppText variant="title">Looking for your partner</AppText>
              <AppText muted>
                We're matching you with someone doing {habit} who wants the same thing. Since we're
                just getting started, this usually takes a day or two — we'll notify you the moment
                you're matched.
              </AppText>
            </>
          ) : phase === 'pending' && sentInvite ? (
            <>
              <AppText variant="title">
                {sentInvite.emailed ? `Waiting for ${sentInvite.email}` : 'Send them the link'}
              </AppText>
              <AppText muted>
                {sentInvite.emailed
                  ? 'Your challenge starts the moment they join.'
                  : "We couldn't email them, but the invite is saved. Share this link and it works the same."}
              </AppText>
            </>
          ) : (
            <>
              <AppText variant="title">How do you want to do this?</AppText>
              <AppText muted>Choner works best with two — but the choice is yours.</AppText>
            </>
          )}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(120).duration(360)}>
          <Card style={styles.habitCard}>
            <AppText variant="subtitle">{habit}</AppText>
            <AppText variant="caption" muted>
              7-day challenge
              {phase === 'finding' || phase === 'pending' ? ' · not started yet' : ''}
            </AppText>
          </Card>
        </Animated.View>

        {phase === 'choose' ? (
          <Animated.View entering={FadeInDown.delay(200).duration(360)} style={styles.options}>
            <OptionCard
              icon="👋"
              label="Invite someone you know"
              description="A friend, sibling, or gym buddy — anyone chasing the same goal."
              selected={false}
              onPress={() => setPhase('emailEntry')}
            />
            {isCustomHabit ? (
              <View style={styles.customNote}>
                <AppText variant="caption" muted>
                  Finding a partner works best with our suggested challenges — since you picked your
                  own, try inviting someone you know.
                </AppText>
              </View>
            ) : (
              <OptionCard
                icon="🔎"
                label="Find the right partner"
                description="We'll match you with someone who wants the same thing."
                selected={false}
                onPress={onFindPartner}
              />
            )}
          </Animated.View>
        ) : null}

        {phase === 'emailEntry' ? (
          <Animated.View entering={FadeInDown.duration(280)} style={styles.emailBlock}>
            <Input
              label="Partner's email"
              placeholder="name@example.com"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            <AppText variant="caption" muted>
              Enter the email of a friend, partner, sibling, or gym buddy — anyone who'll actually
              show up.
            </AppText>
          </Animated.View>
        ) : null}

        {phase === 'pending' && sentInvite && !sentInvite.emailed && lastToken ? (
          <View style={styles.linkBox}>
            <AppText variant="caption" selectable style={{ color: theme.colors.text }}>
              {buildInviteLink(lastToken)}
            </AppText>
          </View>
        ) : null}

        {phase === 'pending' && sentInvite ? (
          <Animated.View entering={FadeInDown.duration(280)} style={styles.pendingActions}>
            <Button
              label="Share invite link"
              variant="secondary"
              size="sm"
              disabled={!lastToken}
              onPress={onShare}
            />
            {/* Resending only helps once email actually delivers; offering it
                while the email channel is down is a dead end. */}
            {sentInvite.emailed ? (
              <Button
                label="Resend invite"
                variant="secondary"
                size="sm"
                loading={resendInvite.isPending}
                disabled={!lastToken}
                onPress={onResend}
              />
            ) : null}
            <Button
              label="Invite someone else instead"
              variant="ghost"
              size="sm"
              onPress={() => {
                setEmail('');
                setPhase('emailEntry');
              }}
            />
          </Animated.View>
        ) : null}
      </ScrollView>

      <Animated.View entering={FadeInDown.delay(280).duration(360)} style={styles.footer}>
        {phase === 'choose' ? (
          <>
            {/* Deliberately lighter than the two options above: solo is a real
                choice, not the one we're steering toward. */}
            <Button label="Continue solo, for now" variant="ghost" onPress={goHome} />
            <AppText variant="caption" muted style={styles.supporting}>
              Start today. You can add a partner anytime.
            </AppText>
          </>
        ) : null}
        {phase === 'emailEntry' ? (
          <>
            <Button
              label="Send invite"
              disabled={!EMAIL_RE.test(email)}
              loading={busy || createInvite.isPending}
              onPress={onSendInvite}
            />
            <Button label="Back" variant="ghost" onPress={() => setPhase('choose')} />
          </>
        ) : null}
        {phase === 'finding' ? (
          <>
            <PulsingWaitButton label="Looking for your partner…" />
            <AppText variant="caption" muted style={styles.supporting}>
              In the meantime, you can still start today on your own.
            </AppText>
            <Button label="Take me home" variant="ghost" onPress={goHome} />
            <Button
              label="Invite someone you know instead"
              variant="ghost"
              onPress={() => setPhase('emailEntry')}
            />
          </>
        ) : null}
        {phase === 'pending' && sentInvite ? (
          <>
            <PulsingWaitButton label={`Waiting for ${sentInvite.email}...`} />
            <Button label="Done — take me home" variant="ghost" onPress={goHome} />
          </>
        ) : null}
      </Animated.View>
    </SafeAreaView>
  );
}

// The disabled waiting CTA with the spec's subtle pulse; static under reduced
// motion.
function PulsingWaitButton({ label }: { label: string }) {
  const reduceMotion = useReduceMotion();
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (!reduceMotion) {
      pulse.value = withRepeat(withTiming(0.6, { duration: 900 }), -1, true);
    }
  }, [reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: reduceMotion ? 1 : pulse.value
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Button label={label} disabled onPress={() => undefined} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: 20, paddingTop: theme.spacing(3), gap: theme.spacing(2.5), flexGrow: 1 },
  header: { gap: theme.spacing(1) },
  habitCard: { gap: theme.spacing(0.5) },
  options: { gap: theme.spacing(1.5) },
  customNote: {
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.colors.border,
    padding: theme.spacing(2)
  },
  emailBlock: { gap: theme.spacing(1) },
  linkBox: {
    backgroundColor: theme.colors.surface2,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    padding: theme.spacing(1.5)
  },
  pendingActions: { gap: theme.spacing(1) },
  supporting: { textAlign: 'center' },
  footer: { padding: 20, paddingTop: theme.spacing(1), gap: theme.spacing(1) }
});
