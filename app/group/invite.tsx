import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Icon } from '@/components/ui/Icon';
import { PressableScale } from '@/components/ui/PressableScale';
import { useSession } from '@/providers/session-provider';
import { useCreateInvite, usePendingInvites } from '@/features/community/hooks';
import { setPartnerState } from '@/features/challenges/api';
import { useMyChallenge } from '@/features/challenges/hooks';
import { useProfile } from '@/features/profile/hooks';
import { buildInviteLink, shareInviteLink } from '@/lib/invite-link';
import { inviteMessage } from '@/features/community/invite-message';
import { theme } from '@/constants/theme';
import { notify } from '@/lib/alert';

type Invite = { token: string; code: string | null };

// Invite someone you know: the prototype's share-first screen (#110).
//
// Your message, built from the challenge and editable, then the link and the
// 6-character code that always travel with it. Share invite opens WhatsApp,
// Messages or a copied link through the phone's own sheet; email is the
// optional second way. It replaced an email-only form.
//
// Sending puts the challenge into the 'invited' wait and returns to Find, which
// shows that state, the code and "share again" until they join.
export default function InviteScreen() {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const userId = session?.user.id;
  const profileQ = useProfile(userId);
  const challengeQ = useMyChallenge(userId);
  const invitesQ = usePendingInvites(userId);
  const createInvite = useCreateInvite();

  const challenge = challengeQ.data ?? null;
  const fullName = profileQ.data?.full_name ?? null;
  const [message, setMessage] = useState<string | null>(null);
  const [invite, setInvite] = useState<Invite | null>(null);
  const [byEmail, setByEmail] = useState(false);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const creating = useRef(false);

  // The default message, once the name and the activity are known. Never over
  // something the person has already typed.
  useEffect(() => {
    if (message !== null || !profileQ.data || challengeQ.isLoading) return;
    setMessage(
      inviteMessage(fullName, (challenge?.challenge_templates?.activity_key as string | undefined) ?? null)
    );
  }, [message, profileQ.data, challengeQ.isLoading, fullName, challenge]);

  // One invite per challenge: reuse the pending one, so opening this screen
  // twice does not mint a second code. Otherwise make it now, so the link and
  // code are on screen before anything is sent. An unsent invite expires on
  // its own after 48 hours.
  useEffect(() => {
    if (invite || creating.current || !userId || !challenge?.id || invitesQ.isLoading) return;
    const existing = (invitesQ.data ?? []).find((i: any) => i.user_challenge_id === challenge.id);
    if (existing?.token) {
      setInvite({ token: existing.token, code: existing.code ?? null });
      return;
    }
    creating.current = true;
    createInvite
      .mutateAsync({ userChallengeId: challenge.id, inviterId: userId, inviterName: fullName ?? undefined })
      .then((row: any) => setInvite({ token: row.token, code: row.code ?? null }))
      .catch((e: any) => notify('Could not make your invite', e.message))
      .finally(() => {
        creating.current = false;
      });
  }, [invite, userId, challenge?.id, invitesQ.isLoading, invitesQ.data, createInvite, fullName]);

  // The invite is out: the challenge waits for them, and Find shows it.
  const markInvited = async () => {
    if (challenge?.id && challenge.partner_state !== 'partnered') {
      try {
        await setPartnerState(challenge.id, 'invited');
      } catch {
        // The invite works either way; this is the waiting state on top of it.
      }
    }
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['my-challenge'] }),
      queryClient.invalidateQueries({ queryKey: ['pending-invites'] })
    ]);
  };

  const onShare = async () => {
    if (!invite) return;
    setBusy(true);
    try {
      const how = await shareInviteLink(invite.token, fullName, invite.code, message);
      if (how === 'failed') {
        notify('Could not share', 'Send them the code instead.');
        return;
      }
      if (how === 'copied') notify('Copied', 'Paste it to your partner to bring them in.');
      await markInvited();
      router.back();
    } finally {
      setBusy(false);
    }
  };

  const onEmail = async () => {
    const to = email.trim();
    if (!userId || !to) return;
    setBusy(true);
    try {
      const result: any = await createInvite.mutateAsync({
        userChallengeId: challenge?.id,
        email: to,
        inviterId: userId,
        inviterName: fullName ?? undefined
      });
      await markInvited();
      if (result.emailed) {
        notify('Invite sent', `We emailed ${to}. The code ${result.code ?? ''} works too.`.trim());
      } else {
        notify("We couldn't email that", 'The invite is saved. Share the link or the code from Find instead.');
      }
      router.back();
    } catch (e: any) {
      notify('Could not send invite', e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      {/* The prototype's hdr(): a round back button and the title beside it. */}
      <View style={styles.header}>
        <PressableScale
          onPress={() => router.back()}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={styles.back}
        >
          <Icon name="back" size={20} color={theme.colors.text} strokeWidth={2.2} />
        </PressableScale>
        <AppText style={styles.title}>Invite someone you know</AppText>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <AppText style={styles.label}>Your message</AppText>
          <TextInput
            value={message ?? ''}
            onChangeText={setMessage}
            multiline
            style={styles.message}
            placeholderTextColor={theme.colors.muted}
            accessibilityLabel="Invite message"
          />

          <View style={styles.linkBox}>
            {invite ? (
              <>
                <AppText style={styles.linkText} selectable>
                  {buildInviteLink(invite.token)}
                </AppText>
                {invite.code ? (
                  <AppText style={styles.linkText} selectable>
                    Code: <AppText style={styles.code}>{invite.code}</AppText>
                  </AppText>
                ) : null}
              </>
            ) : (
              <AppText style={styles.linkText}>Making your link and code…</AppText>
            )}
          </View>
          <AppText style={styles.hint}>
            The link and the code go with your message. The code is for a friend who installs the app
            first. <AppText style={styles.hintBold}>It expires in 48 hours.</AppText>
            {'\n'}How far and how often is not in the invite: you will agree that together once they join.
          </AppText>

          {byEmail ? (
            <Input
              label="Their email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="name@example.com"
            />
          ) : (
            <AppText style={styles.or}>
              or{' '}
              <AppText style={styles.orLink} onPress={() => setByEmail(true)} accessibilityRole="button">
                send it by email
              </AppText>
            </AppText>
          )}
        </ScrollView>

        <View style={styles.footer}>
          {byEmail ? (
            <>
              <Button label="Send by email" loading={busy} disabled={!email.trim()} onPress={onEmail} />
              <Button label="Share a link instead" variant="ghost" onPress={() => setByEmail(false)} />
            </>
          ) : (
            <Button
              label="Share invite"
              leftIcon={<Icon name="share" size={19} color="#FFFFFF" strokeWidth={2} />}
              loading={busy}
              disabled={!invite}
              onPress={onShare}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingTop: 8, paddingBottom: 6 },
  back: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 17, color: theme.colors.text, fontFamily: theme.fonts.bodyBold },
  content: { padding: 22, paddingTop: 12, gap: 10 },
  label: { fontSize: 12.5, color: theme.colors.text, fontFamily: theme.fonts.bodyMedium },
  message: {
    minHeight: 92,
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    fontSize: 14,
    lineHeight: 21,
    color: theme.colors.text,
    fontFamily: theme.fonts.body,
    textAlignVertical: 'top'
  },
  linkBox: { backgroundColor: theme.colors.surface3, borderRadius: 12, padding: 14, gap: 2, marginTop: 6 },
  linkText: { fontSize: 12.5, color: theme.colors.text },
  code: { fontSize: 12.5, color: theme.colors.text, fontFamily: theme.fonts.bodyBold, letterSpacing: 0.5 },
  hint: { fontSize: 12, lineHeight: 18, color: theme.colors.muted },
  hintBold: { fontSize: 12, lineHeight: 18, color: theme.colors.muted, fontFamily: theme.fonts.bodyBold },
  or: { textAlign: 'center', fontSize: 13, color: theme.colors.muted, marginTop: 6 },
  orLink: { fontSize: 13, color: theme.colors.primary2, fontFamily: theme.fonts.bodyBold },
  footer: { paddingHorizontal: 22, paddingBottom: 12, gap: 4 }
});
