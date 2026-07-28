import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AppText } from '@/components/ui/text';
import { useSession } from '@/providers/session-provider';
import { useCreateInvite } from '@/features/community/hooks';
import { useDefaultChallenges } from '@/features/challenges/hooks';
import { useProfile } from '@/features/profile/hooks';
import { buildInviteLink, shareInviteLink } from '@/lib/invite-link';
import { theme } from '@/constants/theme';

export default function InviteScreen() {
  const { session } = useSession();
  const userId = session?.user.id;
  const profileQ = useProfile(userId);
  const challengesQ = useDefaultChallenges(userId);
  const inviteMut = useCreateInvite();
  const [email, setEmail] = useState('');
  // Set once an invite exists, so the link is always shareable even if the
  // email didn't go out.
  const [sent, setSent] = useState<{ email: string; token: string | null; emailed: boolean } | null>(
    null
  );

  const onSubmit = async () => {
    if (!userId || !email.trim()) return;
    try {
      const result = await inviteMut.mutateAsync({
        // Attach the pending partner track so accepting lights this exact
        // fire (and Home's "waiting for partner" state can match the invite).
        userChallengeId: challengesQ.data?.partner?.id,
        email: email.trim(),
        inviterId: userId,
        inviterName: profileQ.data?.full_name ?? undefined,
      });
      setSent({ email: email.trim(), token: result.token, emailed: result.emailed });
      setEmail('');
    } catch (e: any) {
      Alert.alert('Could not send invite', e.message);
    }
  };

  const onShare = async () => {
    if (!sent?.token) return;
    const how = await shareInviteLink(sent.token, profileQ.data?.full_name);
    if (how === 'copied') Alert.alert('Link copied', 'Paste it to your partner to bring them in.');
    if (how === 'failed') Alert.alert('Could not share', 'Copy the link shown above instead.');
  };

  if (sent) {
    return (
      <Screen>
        <ScreenHeader title="Invite a friend" onBack={() => router.back()} />

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
            : `We couldn't email ${sent.email}. The invite is saved — resend it once email is set up.`}
        </AppText>

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
      <ScreenHeader title="Invite a friend" onBack={() => router.back()} />

      <View style={{ gap: 8 }}>
        <AppText variant="muted">
          Invite a friend to start a private challenge with you. They'll get an email with a link to
          join — and you'll get a link you can send them directly.
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
