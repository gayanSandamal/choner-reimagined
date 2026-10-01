import { StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/button';
import { EndedRole, MATCH_ENDED_TITLE, matchEndedLine } from '@/features/safety/rules';
import { theme } from '@/constants/theme';

// Shown to whoever just ended, blocked or reported. The first line is the same
// one the other person receives; only the second line knows who is looking.
//
// `report` is set only when the match was ended with "Something felt off".
// The match is already over by the time this renders; the report is OFFERED
// here, never required. It is filed against the pairing that just ended, which
// report_partner() still accepts for ten minutes.
export default function MatchEndedModal() {
  const params = useLocalSearchParams<{ role?: string; report?: string; name?: string }>();
  const role: EndedRole =
    params.role === 'blocker' || params.role === 'reporter' || params.role === 'ender'
      ? params.role
      : 'other';
  const reportId = typeof params.report === 'string' && params.report ? params.report : null;
  const name = (typeof params.name === 'string' && params.name.trim()) || 'them';

  return (
    <Screen scroll={false} contentStyle={styles.screen}>
      <View style={styles.body}>
        <View style={styles.icon}>
          <Ionicons name="checkmark" size={24} color={theme.colors.success} />
        </View>
        <AppText variant="title" style={styles.title}>
          {MATCH_ENDED_TITLE}
        </AppText>
        <AppText muted style={styles.line}>
          {matchEndedLine(role)}
        </AppText>
      </View>
      {reportId ? (
        <View style={styles.report}>
          <AppText muted style={styles.line}>
            If something felt wrong, you can tell us. Someone from our team reads every report.
          </AppText>
          <Button
            label={`Report ${name}`}
            variant="outline"
            onPress={() =>
              router.replace({
                pathname: '/modals/report',
                params: { mode: 'pair', id: reportId, name }
              })
            }
          />
        </View>
      ) : null}
      <Button label="Done" variant={reportId ? 'ghost' : undefined} onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'space-between', paddingBottom: theme.spacing(2) },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing(1.5) },
  icon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(79,201,138,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(79,201,138,0.25)',
    marginBottom: theme.spacing(1)
  },
  title: { textAlign: 'center' },
  report: { gap: theme.spacing(1.5), alignItems: 'center', marginBottom: theme.spacing(1) },
  line: { textAlign: 'center', maxWidth: 280, lineHeight: 20 }
});
