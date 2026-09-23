import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PressableScale } from '@/components/ui/PressableScale';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { LoadingState } from '@/components/ui/StateViews';
import { usePairingMet, useReportMatch, useReportPartner } from '@/features/safety/hooks';
import {
  ReportCategory,
  reportCategoriesFor,
  safetyRefusalMessage
} from '@/features/safety/rules';
import { notify } from '@/lib/alert';
import { theme } from '@/constants/theme';

// Report is the escalation path: a category is required, a founder reads every
// row, and submitting always ends the match too. Two ways in —
//   mode=match  from Match Found, before either side has accepted (id = match)
//   mode=pair   from the "···" menu once paired         (id = user_challenge)
export default function ReportModal() {
  const params = useLocalSearchParams<{ mode?: string; id?: string; name?: string }>();
  const mode = params.mode === 'match' ? 'match' : 'pair';
  const id = typeof params.id === 'string' ? params.id : undefined;
  const name = (typeof params.name === 'string' && params.name.trim()) || 'this person';

  // A pending match can't have met by definition, so there is nothing to ask.
  const metQ = usePairingMet(mode === 'pair' ? id : undefined);
  const met = mode === 'pair' ? metQ.data ?? false : false;
  const categories = reportCategoriesFor(met);

  const [category, setCategory] = useState<ReportCategory | null>(null);
  const [details, setDetails] = useState('');
  const reportPartner = useReportPartner();
  const reportMatch = useReportMatch();
  const submitting = reportPartner.isPending || reportMatch.isPending;

  const onSubmit = async () => {
    if (!id || !category) return;
    try {
      const freeText = details.trim() || null;
      const result =
        mode === 'match'
          ? await reportMatch.mutateAsync({ matchId: id, category, freeText })
          : await reportPartner.mutateAsync({ userChallengeId: id, category, freeText });
      if (!result.ok) {
        notify('Could not send that', safetyRefusalMessage(result.reason));
        return;
      }
      router.replace({ pathname: '/modals/match-ended', params: { role: 'reporter' } });
    } catch (error: any) {
      notify('Could not send that', error.message);
    }
  };

  return (
    <Screen scroll={false} contentStyle={styles.screen}>
      <ScreenHeader title={`Report ${name}`} onClose={() => router.back()} />
      {mode === 'pair' && metQ.isLoading ? (
        <LoadingState />
      ) : (
        <>
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Said up front: nobody should discover afterwards that sending a
                report also ended the match. */}
            <AppText muted>
              Someone from our team reads every report. Sending one also ends your match.
            </AppText>

            <View style={styles.options}>
              {categories.map((c) => {
                const active = category === c.value;
                return (
                  <PressableScale
                    key={c.value}
                    onPress={() => setCategory(c.value)}
                    haptic="selection"
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={c.label}
                    style={[styles.option, active && styles.optionActive]}
                  >
                    <AppText style={[styles.optionLabel, active && styles.optionLabelActive]}>
                      {c.label}
                    </AppText>
                  </PressableScale>
                );
              })}
            </View>

            <Input
              label="Anything else we should know? (optional)"
              value={details}
              onChangeText={setDetails}
              multiline
              maxLength={1000}
              textAlignVertical="top"
              boxStyle={styles.details}
            />
          </ScrollView>
          <View style={styles.footer}>
            <Button
              label="Send report"
              variant="danger"
              loading={submitting}
              disabled={!category || !id}
              onPress={onSubmit}
            />
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, gap: 0 },
  content: { gap: theme.spacing(2.5), paddingBottom: theme.spacing(3), flexGrow: 1 },
  options: { gap: theme.spacing(1) },
  option: {
    backgroundColor: theme.colors.surface3,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: 'transparent',
    paddingVertical: theme.spacing(1.5),
    paddingHorizontal: theme.spacing(1.5)
  },
  optionActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.surface },
  optionLabel: { color: theme.colors.text, fontSize: 14 },
  optionLabelActive: { fontFamily: theme.fonts.bodyMedium },
  details: { minHeight: 96 },
  footer: { paddingTop: theme.spacing(1) }
});
