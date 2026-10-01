import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AppText } from '@/components/ui/text';
import { useSession } from '@/providers/session-provider';
import { useCreateInvite } from '@/features/community/hooks';
import { setPartnerState } from '@/features/challenges/api';
import { useMyChallenge } from '@/features/challenges/hooks';
import { useProfile } from '@/features/profile/hooks';
import { buildInviteLink, shareInviteLink } from '@/lib/invite-link';
import { theme } from '@/constants/theme';
import { notify } from '@/lib/alert';

// Invite someone you know. Reached from Find, which owns every partner path.
// Sending puts the challenge into the 'invited' wait, and Find shows that
// state until they join.
export default function InviteScreen() {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const userId = session?.user.id;
  const profileQ = useProfile(userId);
  const challengesQ = useMyChallenge(userId);
  const inviteMut = useCreateInvite();
  const [email, setEmail] = useState('');
  // Set once an invite exists, so the link is always shareable even if the
  // email didn't go out.
  const [sent, setSent] = useState<{ email: string; token: string | null; code: string | null; emailed: boolean } | null>(
    null
  );

  const onSubmit = async () => {
    if (!userId || !email.trim()) return;
    try {
      const result = await inviteMut.mutateAsync({
        // Attach the challenge so accepting joins this exact habit (and the
        // "waiting for [name]" state can match the invite to it).
        userChallengeId: challengesQ.data?.id,
        email: email.trim(),
        inviterId: userId,
        inviterName: profileQ.data?.full_name ?? undefined,
      });
      // The invite row is what matters; the wait state is a courtesy on top of
      // it, so a failure here must not read as "the invite didn't send".
      if (challengesQ.data?.id && challengesQ.data.partner_state !== 'partnered') {
        try {
          await setPartnerState(challengesQ.data.id, 'invited');
          queryClient.invalidateQueries({ queryKey: ['my-challenge'] });
          queryClient.invalidateQueries({ queryKey: ['pending-invites'] });
        } catch {
          // Find still shows the landing; the invite works either way.
        }
      }
      setSent({
        email: email.trim(),
        token: result.token,
        code: result.code ?? null,
        emailed: result.emailed
      });
      setEmail('');
    } catch (e: any) {
      notify('Could not send invite', e.message);
    }
  };

  const onShare = async () => {
    if (!sent?.token) return;
    const how = await shareInviteLink(sent.token, profileQ.data?.full_name, sent.code);
    if (how === 'copied') notify('Link copied', 'Paste it to your partner to bring them in.');
    if (how === 'failed') notify('Could not share', 'Copy the link shown above instead.');
  };

  if (sent) {
    return (
      <Screen>
        <ScreenHeader title="Invite someone" onBack={() => router.back()} />

        <View style={styles.statusRow}>
          <Ionicons
            name={sent.emailed ? 'mail' : 'link'}
            size={18}
            color={sent.emailed ? theme.colors.success : theme.colors.primary2}
          />
          <AppText variant="subtitle" style={{ flexShrink: 1 }}>
            {sent.emailed ? `Invite emailed to ${sent.email}` : 'Invite ready to share'}
          </AppText>
        </View>

        <AppText variant="muted">
          {sent.token
            ? sent.emailed
              ? 'They can also join with this link:'
              : `We couldn't email ${sent.email}, but the invite is saved. Send them this link and it works the same:`
            : `We couldn't email ${sent.email}. The invite is saved, and you can send it again from Find.`}
        </AppText>

        {sent.code ? (
          <View style={styles.linkBox}>
            <AppText variant="muted">
              Their code, good for 48 hours. They enter it under "I have an invite code".
            </AppText>
            <AppText variant="subtitle" selectable style={{ letterSpacing: 2 }}>
              {sent.code}
            </AppText>
          </View>
        ) : null}

        {sent.token ? (
          <>
            <View style={styles.linkBox}>
              <AppText variant="caption" selectable style={{ color: theme.colors.text }}>
                {buildInviteLink(sent.token)}
              </AppText>
            </View>

            <Button label="Share invite link" onPress={onShare} />
          </>
        ) : null}
        <Button label="Done" variant="ghost" onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader title="Invite someone" onBack={() => router.back()} />

      <View style={{ gap: 8 }}>
        <AppText variant="muted">
          Invite someone you know to do this with you. They get an email with a link to join, and
          you get a link and a code you can send them yourself.
        </AppText>
      </View>

      <Input
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="friend@example.com"
      />

      <Button
        label={inviteMut.isPending ? 'Sending...' : 'Send invite'}
        onPress={onSubmit}
        disabled={inviteMut.isPending || !email.trim()}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  linkBox: {
    backgroundColor: theme.colors.surface2,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    padding: theme.spacing(1.5)
  }
});
