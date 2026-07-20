import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
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
import { useOnboarding } from '@/features/onboarding/context';
import { goalToTemplateSlug, suggestedHabitTitle } from '@/features/onboarding/mappings';
import { getTemplateBySlug, getTemplates, getDefaultChallenges, ensureDefaultChallenges } from '@/features/challenges/api';
import { useCreateInvite, useResendInvite } from '@/features/community/hooks';
import { useSession } from '@/providers/session-provider';
import { useProfile } from '@/features/profile/hooks';
import { useReduceMotion } from '@/lib/motion';
import { theme } from '@/constants/theme';

type Phase = 'idle' | 'emailEntry' | 'pending' | 'skipped';

const EMAIL_RE = /^\S+@\S+\.\S+$/;

export default function InviteScreen() {
  const { session } = useSession();
  const userId = session?.user.id;
  const profileQ = useProfile(userId);
  const { goal, struggle, startedChallengeId, setStartedChallengeId, sentInvite, setSentInvite } =
    useOnboarding();

  const [phase, setPhase] = useState<Phase>(sentInvite ? 'pending' : 'idle');
  const [email, setEmail] = useState('');
  const [lastToken, setLastToken] = useState<string | null>(null);
  const [attaching, setAttaching] = useState(false);

  const createInvite = useCreateInvite();
  const resendInvite = useResendInvite();

  const slug = goalToTemplateSlug(goal);
  // Prefetched so the send tap doesn't wait on a template lookup; the
  // first-templates fallback covers a database missing the seeds.
  const templateQ = useQuery({
    queryKey: ['challenge-template-slug', slug],
    queryFn: async () => (await getTemplateBySlug(slug)) ?? (await getTemplates())[0] ?? null
  });

  const sending = attaching || createInvite.isPending;

  // Resolve the partner track to attach this invite to. Onboarding already
  // provisioned a pending partner challenge; reuse it rather than creating a
  // second one. Falls back to provisioning if it's somehow missing.
  const resolvePartnerChallengeId = async (): Promise<string> => {
    const existing = await getDefaultChallenges(userId!);
    if (existing.partner?.id) return existing.partner.id;

    const template = templateQ.data ?? (await getTemplates())[0];
    if (!template) throw new Error('No challenge templates available yet.');
    await ensureDefaultChallenges({
      userId: userId!,
      soloTemplateId: template.id,
      partnerTemplateId: template.id
    });
    const after = await getDefaultChallenges(userId!);
    if (!after.partner?.id) throw new Error('Could not set up your partner challenge.');
    return after.partner.id;
  };

  const onSendInvite = async () => {
    if (!userId || !EMAIL_RE.test(email)) return;
    try {
      let challengeId = startedChallengeId;
      if (!challengeId) {
        setAttaching(true);
        challengeId = await resolvePartnerChallengeId();
        setAttaching(false);
        // Kept in context so a failed invite retry can't start a second one.
        setStartedChallengeId(challengeId!);
      }
      const invite = await createInvite.mutateAsync({
        userChallengeId: challengeId!,
        email: email.trim(),
        inviterId: userId,
        inviterName: profileQ.data?.full_name ?? undefined
      });
      setLastToken(invite.token ?? null);
      setSentInvite({ email: email.trim() });
      setPhase('pending');
    } catch (error: any) {
      setAttaching(false);
      Alert.alert(
        startedChallengeId ? "The invite didn't send" : 'Could not set up your challenge',
        startedChallengeId
          ? `Your challenge is ready, but we couldn't send the invite. ${error.message}`
          : error.message
      );
    }
  };

  const onResend = async () => {
    if (!sentInvite || !lastToken) return;
    try {
      await resendInvite.mutateAsync({
        email: sentInvite.email,
        token: lastToken,
        user_challenge_id: startedChallengeId,
        inviterName: profileQ.data?.full_name ?? undefined
      });
      Alert.alert('Invite resent', `We sent another email to ${sentInvite.email}.`);
    } catch (error: any) {
      Alert.alert('Could not resend', error.message);
    }
  };

  const habit = suggestedHabitTitle(goal);
  const showLeadIn = struggle === 'lack_accountability';

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
          {phase !== 'skipped' ? (
            <>
              {showLeadIn ? (
                <AppText variant="subtitle" style={styles.leadIn}>
                  This is exactly what you told us you needed
                </AppText>
              ) : null}
              <AppText variant="title">Let's set this up with a partner</AppText>
              <AppText muted>
                Choner works best with two. Invite someone to hold you accountable — and you do the
                same for them.
              </AppText>
            </>
          ) : (
            <>
              <AppText variant="title">We'll find you a partner</AppText>
              <AppText muted>
                We'll match you with someone doing the same challenge when you're ready.
              </AppText>
            </>
          )}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(140).duration(360)}>
          <Card variant={phase === 'pending' ? 'glow' : 'default'} style={styles.challengeCard}>
            {phase === 'pending' && sentInvite ? (
              <>
                <AppText variant="subtitle">Waiting for {sentInvite.email} to join Choner</AppText>
                <AppText variant="caption" muted>
                  Your challenge starts the moment they sign up.
                </AppText>
              </>
            ) : (
              <>
                <AppText variant="subtitle">{habit}</AppText>
                <AppText variant="caption" muted>
                  7-day challenge · Starts once you're both in
                </AppText>
              </>
            )}
          </Card>
        </Animated.View>

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

        {phase === 'pending' ? (
          <Animated.View entering={FadeInDown.duration(280)} style={styles.pendingActions}>
            <Button
              label="Resend invite"
              variant="secondary"
              size="sm"
              loading={resendInvite.isPending}
              disabled={!lastToken}
              onPress={onResend}
            />
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

      <Animated.View entering={FadeInDown.delay(240).duration(360)} style={styles.footer}>
        {phase === 'idle' ? (
          <>
            <Button label="Invite your partner" onPress={() => setPhase('emailEntry')} />
            <AppText variant="caption" muted style={styles.supporting}>
              Send it to a friend, partner, sibling, or gym buddy — anyone who'll actually show up.
            </AppText>
            <Button label="Skip for now" variant="ghost" onPress={() => setPhase('skipped')} />
          </>
        ) : null}
        {phase === 'emailEntry' ? (
          <>
            <Button
              label="Send invite"
              disabled={!EMAIL_RE.test(email)}
              loading={sending}
              onPress={onSendInvite}
            />
            <Button label="Skip for now" variant="ghost" onPress={() => setPhase('skipped')} />
          </>
        ) : null}
        {phase === 'pending' && sentInvite ? (
          <>
            <PulsingWaitButton label={`Waiting for ${sentInvite.email}...`} />
            <Button
              label="Done — take me home"
              variant="ghost"
              onPress={() => router.replace('/(tabs)/home')}
            />
          </>
        ) : null}
        {phase === 'skipped' ? (
          <>
            <Button label="Go to my home" onPress={() => router.replace('/(tabs)/home')} />
            <Button label="Actually, let me invite someone" variant="ghost" onPress={() => setPhase('idle')} />
          </>
        ) : null}
      </Animated.View>
    </SafeAreaView>
  );
}

// The disabled post-invite CTA with the spec's subtle pulse; static under
// reduced motion.
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
  leadIn: { color: theme.colors.primary2 },
  challengeCard: { gap: theme.spacing(0.5) },
  emailBlock: { gap: theme.spacing(1) },
  pendingActions: { gap: theme.spacing(1) },
  supporting: { textAlign: 'center' },
  footer: { padding: 20, paddingTop: theme.spacing(1), gap: theme.spacing(1) }
});
