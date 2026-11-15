import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { Icon } from '@/components/ui/Icon';
import { PairMark, pairMarkState } from '@/components/home/PairMark';
import { HEART_STAGES, heartCopy } from '@/features/home/hero';
import { theme } from '@/constants/theme';

// The pair card at the top of Home: "You + ?" before a partner, "You + Gayan"
// after.
//
// It used to be a heart (#112, #113). A heart reads as romance or dating,
// which Choner is not, so on 14 Nov 2026 it became the pair mark: your orange
// circle, and beside it your partner's, empty until there is one. See
// PairMark.tsx.
//
// It counts sessions WITH THIS PARTNER, and the dots fill at 1, 5, 10, 25 and
// 50. It is not the streak: the streak is personal and lives on Challenges.
// Nothing here is tappable, and nothing here resets. The heart also grew a
// little at each stage; the pair mark is wide and stays one size, so the dots
// carry that progress on their own.
export function HomePair({
  partnerName,
  partnerState,
  sessionsTogether
}: {
  partnerName: string | null;
  partnerState: string;
  sessionsTogether: number;
}) {
  const copy = heartCopy({ partnerName, partnerState, sessionsTogether });
  const partnered = Boolean(partnerName);

  return (
    <View
      style={styles.card}
      accessible
      accessibilityLabel={[copy.title, copy.count, copy.line].filter(Boolean).join('. ')}
    >
      <View style={styles.markWrap}>
        <PairMark state={pairMarkState(partnered, partnerState)} width={250} />
      </View>

      <AppText style={styles.title}>{copy.title}</AppText>
      {copy.count ? (
        <View style={styles.countRow}>
          <Icon name="fire" size={20} color={theme.colors.primary2} />
          <AppText style={styles.count}>{copy.count}</AppText>
        </View>
      ) : null}
      {copy.line ? <AppText style={styles.line}>{copy.line}</AppText> : null}
      {partnered ? (
        <View style={styles.stages}>
          {HEART_STAGES.map((m) => (
            <View key={m} style={[styles.dot, sessionsTogether >= m && styles.dotOn]} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 22,
    paddingTop: 18,
    paddingHorizontal: 16,
    paddingBottom: 16,
    alignItems: 'center',
    gap: 8,
    ...theme.shadow.sm
  },
  markWrap: { width: '100%', alignItems: 'center', justifyContent: 'center' },
  // "You + ?" in the brand orange, as the prototype.
  title: { fontSize: 20, lineHeight: 26, color: theme.colors.primary2, fontFamily: theme.fonts.bodyBold },
  countRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  count: { fontSize: 15, color: theme.colors.text, fontFamily: theme.fonts.bodyBold },
  line: { fontSize: 12.5, lineHeight: 19, color: theme.colors.muted, textAlign: 'center' },
  stages: { flexDirection: 'row', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.border },
  dotOn: { backgroundColor: theme.colors.primary2 }
});
