import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/ui/AppText';
import { HEART_STAGES, heartCopy, heartStage } from '@/features/home/hero';
import { theme } from '@/constants/theme';

// The shared heart: "You + ?" before a partner, "You + Gayan" after.
//
// It counts sessions WITH THIS PARTNER and grows at 1, 5, 10, 25 and 50. It is
// not the streak: the streak is personal and lives on Challenges. Nothing here
// is tappable, and nothing here resets.
export function HomeHeart({
  partnerName,
  partnerState,
  sessionsTogether
}: {
  partnerName: string | null;
  partnerState: string;
  sessionsTogether: number;
}) {
  const stage = heartStage(sessionsTogether);
  const copy = heartCopy({ partnerName, partnerState, sessionsTogether });
  const partnered = Boolean(partnerName);
  const size = 54 + stage * 8;

  return (
    <View
      style={styles.card}
      accessible
      accessibilityLabel={[copy.title, copy.count, copy.line].filter(Boolean).join('. ')}
    >
      <View style={styles.heartWrap}>
        <Ionicons
          name={partnered ? 'heart' : 'heart-half-outline'}
          size={size}
          color={partnered ? theme.colors.primary : '#D8D2CC'}
        />
      </View>
      <AppText style={styles.title}>{copy.title}</AppText>
      {copy.count ? <AppText style={styles.count}>{copy.count}</AppText> : null}
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
  card: { alignItems: 'center', gap: 4, paddingVertical: theme.spacing(1) },
  heartWrap: { width: 100, height: 100, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, color: theme.colors.text, fontFamily: theme.fonts.bodyMedium },
  count: { fontSize: 14, color: theme.colors.primary2, fontFamily: theme.fonts.bodyMedium },
  line: { fontSize: 13, color: theme.colors.muted, textAlign: 'center' },
  stages: { flexDirection: 'row', gap: 6, marginTop: 6 },
  dot: { width: 18, height: 4, borderRadius: 2, backgroundColor: '#E6E1DB' },
  dotOn: { backgroundColor: theme.colors.primary }
});
