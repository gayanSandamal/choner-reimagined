import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { AppText } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { theme } from '@/constants/theme';

// Manual redemption. The invite link is a `choner://` deep link, which does
// nothing for someone who hasn't installed the app yet — and that's every
// invitee. Typing the code gets them to the same place: this hands off to
// app/invite/[token].tsx so acceptance lives in exactly one spot.
//
// The code is six characters with an activity prefix (RUN4K7). No maxLength:
// invites sent before the short code existed carry the long token, and the
// same field has to take those too.
export default function InviteCodeScreen() {
  const [code, setCode] = useState('');
  const trimmed = code.trim();

  return (
    <Screen>
      <ScreenHeader title="Enter invite code" onBack={() => router.back()} />

      <View style={styles.body}>
        <AppText variant="muted">
          Enter the 6-character code from your friend's message or invite email and we'll pull
          you into the challenge. It works for 48 hours.
        </AppText>

        <Input
          label="Invite code"
          placeholder="e.g. RUN4K7"
          autoCapitalize="characters"
          autoCorrect={false}
          value={code}
          onChangeText={setCode}
        />

        <Button
          label="Join the challenge"
          disabled={!trimmed}
          onPress={() => router.replace(`/invite/${encodeURIComponent(trimmed)}`)}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { gap: theme.spacing(2) }
});
