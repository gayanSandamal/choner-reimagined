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
// invitee. Pasting the code gets them to the same place: this hands off to
// app/invite/[token].tsx so acceptance lives in exactly one spot.
export default function InviteCodeScreen() {
  const [code, setCode] = useState('');
  const trimmed = code.trim();

  return (
    <Screen>
      <ScreenHeader title="Enter invite code" onBack={() => router.back()} />

      <View style={styles.body}>
        <AppText variant="muted">
          Paste the code from your invite email and we'll pull you into the challenge.
        </AppText>

        <Input
          label="Invite code"
          placeholder="e.g. 8f3a1c…"
          autoCapitalize="none"
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
