import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/button';
import { PressableScale } from '@/components/ui/PressableScale';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useEndMyMatch } from '@/features/safety/hooks';
import {
  END_MATCH_REASONS,
  EndMatchReason,
  offersReportAfter,
  safetyRefusalMessage
} from '@/features/safety/rules';
import { notify } from '@/lib/alert';
import { theme } from '@/constants/theme';

// Ending a match, the neutral way.
//
// Until this existed the only ways out were Block and Report, both safety
// actions: someone who simply wanted out had to treat their partner as a
// safety problem. This asks why the pairing did not work, ends it, and tells
// the other person only that it ended.
//
// Opened from Find's matched card, which is where every partner action lives.
// `id` is one of the caller's own challenges that names this partner; it is
// only carried through so the report flow, if offered, has something to file
// against. The match itself is ended from the partnership, not from it.
export default function EndMatchModal() {
  const params = useLocalSearchParams<{ id?: string; name?: string }>();
  const name = (typeof params.name === 'string' && params.name.trim()) || 'your partner';
  const id = typeof params.id === 'string' ? params.id : undefined;
  const [reason, setReason] = useState<EndMatchReason | null>(null);
  const endMatch = useEndMyMatch();

  const onEnd = async () => {
    if (!reason) return;
    try {
      const result = await endMatch.mutateAsync(reason);
      // "No partner" means it already ended, most likely from the other side a
      // moment earlier. The outcome the person asked for holds either way.
      if (!result.ok && result.reason !== 'no_partner') {
        notify('Could not end the match', safetyRefusalMessage(result.reason));
        return;
      }
      router.replace({
        pathname: '/modals/match-ended',
        params: {
          role: 'ender',
          // "Something felt off" is a door: the match is over already, and
          // only now is the report offered.
          ...(offersReportAfter(reason) && id ? { report: id, name } : {})
        }
      });
    } catch (error: any) {
      notify('Could not end the match', error.message);
    }
  };

  return (
    <Screen scroll={false} contentStyle={styles.screen}>
      <ScreenHeader title="End this match" onClose={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppText muted>
          What didn't work? {name} won't see your answer. They'll only be told that the match has
          ended.
        </AppText>

        <View style={styles.options}>
          {END_MATCH_REASONS.map((r) => {
            const on = reason === r.value;
            return (
              <PressableScale
                key={r.value}
                onPress={() => setReason(r.value)}
                haptic="selection"
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                accessibilityLabel={r.label}
                style={[styles.option, on && styles.optionOn]}
              >
                <AppText style={styles.optionLabel}>{r.label}</AppText>
              </PressableScale>
            );
          })}
        </View>

        <AppText muted style={styles.note}>
          Your challenge and your streak carry on. You can look for a new partner anytime.
        </AppText>
      </ScrollView>

      <Button
        label="End this match"
        disabled={!reason}
        loading={endMatch.isPending}
        onPress={onEnd}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingBottom: theme.spacing(2) },
  content: { gap: theme.spacing(2), paddingBottom: theme.spacing(2) },
  options: { gap: theme.spacing(1) },
  option: {
    backgroundColor: theme.colors.surface3,
    borderRadius: theme.radius.md,
    padding: theme.spacing(1.75),
    borderWidth: 1.5,
    borderColor: 'transparent'
  },
  optionOn: { borderColor: theme.colors.primary },
  optionLabel: { fontSize: 15, color: theme.colors.text },
  note: { fontSize: 12 }
});
