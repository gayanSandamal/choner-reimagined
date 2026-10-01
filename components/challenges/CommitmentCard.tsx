import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/button';
import { PressableScale } from '@/components/ui/PressableScale';
import { partnerRow } from '@/features/challenges/history';
import { theme } from '@/constants/theme';

// The commitment: what you are doing, and who with.
//
// Before a match it shows the ACTIVITY ONLY, and it is tappable: that is the
// one editable field before a search. How much and how often appear once they
// have been agreed with a partner, and their amount goes with them when a
// match ends, so nothing here can read "You 3 km · Gayan 2 km · Find a match".
//
// The partner row hands off to Find for every state short of partnered. Find
// owns every partner path; this card starts none of them.
export function CommitmentCard({
  activity,
  exercises,
  amounts,
  cadence,
  partnerState,
  partnerFirstName,
  agreed,
  onChangeActivity,
  onOpenFind
}: {
  activity: string;
  // Workouts only. Empty for everything else.
  exercises: string[];
  // "You 5 km · Gayan 3 km" or "5 km each time". Only while partnered.
  amounts: string | null;
  // "3x a week", "Daily". Only once the pair has agreed one.
  cadence: string | null;
  partnerState: string;
  partnerFirstName: string | null;
  // Whether the pair has agreed a plan yet. "Commitment" is not said before.
  agreed: boolean;
  onChangeActivity: () => void;
  onOpenFind: () => void;
}) {
  const solo = partnerState === 'solo';
  const partnered = partnerState === 'partnered';
  const row = partnerRow(partnerState, partnerFirstName);
  const detail = partnered ? [amounts, cadence].filter(Boolean).join(' · ') : '';

  const body = (
    <>
      {/* The word "commitment" is earned (docs/LANGUAGE_FLOW.md): it is the
          result of picking something, finding someone and agreeing a plan,
          so it is not used before all three have happened. */}
      <AppText style={styles.eyebrow}>
        {partnered ? (agreed ? 'YOUR COMMITMENT' : 'YOU FOUND YOUR MATCH') : "LET'S MAKE IT HAPPEN"}
      </AppText>
      <AppText style={styles.activity}>{activity}</AppText>
      {exercises.length ? (
        <AppText muted style={styles.detail}>{exercises.join(', ')}</AppText>
      ) : null}
      {detail ? <AppText style={styles.detail}>{detail}</AppText> : null}
      {partnered ? null : (
        <AppText muted style={styles.lock}>
          {solo
            ? 'You can change this until you start searching for a match'
            : "Locked while you're looking for a match"}
        </AppText>
      )}
    </>
  );

  return (
    <View style={styles.card}>
      {solo ? (
        <PressableScale
          onPress={onChangeActivity}
          haptic="selection"
          accessibilityRole="button"
          accessibilityLabel={`${activity}. Change your activity`}
          style={styles.top}
        >
          {body}
        </PressableScale>
      ) : (
        <View style={styles.top}>{body}</View>
      )}

      <View style={styles.partner}>
        {row.line ? (
          <AppText style={row.kind === 'partnered' ? styles.pair : styles.partnerLine}>{row.line}</AppText>
        ) : null}
        {row.kind === 'handoff' ? <Button label={row.button} onPress={onOpenFind} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 16,
    overflow: 'hidden'
  },
  top: { padding: 18, gap: 4 },
  eyebrow: { fontSize: 10, letterSpacing: 1.2, color: theme.colors.muted, marginBottom: 2 },
  activity: { fontSize: 22, color: theme.colors.text },
  detail: { fontSize: 14, color: theme.colors.text },
  lock: { fontSize: 12, marginTop: 4 },
  partner: {
    padding: 18,
    paddingTop: 14,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border
  },
  partnerLine: { fontSize: 13, color: theme.colors.muted },
  pair: { fontSize: 16, color: theme.colors.text, fontFamily: theme.fonts.bodyMedium }
});
