import { useState } from 'react';
import { Alert, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AppText } from '@/components/ui/text';
import { useSession } from '@/providers/session-provider';
import { useCreateInvite } from '@/features/community/hooks';
import { useProfile } from '@/features/profile/hooks';

export default function InviteScreen() {
  const { session } = useSession();
  const userId = session?.user.id;
  const profileQ = useProfile(userId);
  const inviteMut = useCreateInvite();
  const [email, setEmail] = useState('');

  const onSubmit = async () => {
    if (!userId || !email.trim()) return;
    try {
      await inviteMut.mutateAsync({
        email: email.trim(),
        inviterId: userId,
        inviterName: profileQ.data?.full_name ?? undefined,
      });
      Alert.alert('Invite sent', `We sent your invite to ${email}.`, [{ text: 'OK', onPress: () => router.back() }]);
      setEmail('');
    } catch (e: any) {
      Alert.alert('Could not send invite', e.message);
    }
  };

  return (
    <Screen>
      <ScreenHeader title="Invite a friend" onBack={() => router.back()} />

      <View style={{ gap: 8 }}>
        <AppText variant="muted">
          Invite a friend to start a private challenge with you. They'll get an email with a link to join.
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
