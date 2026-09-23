import { StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/button';
import { EndedRole, MATCH_ENDED_TITLE, matchEndedLine } from '@/features/safety/rules';
import { theme } from '@/constants/theme';

// Shown to whoever just blocked or reported. The first line is the same one the
// other person receives; only the second line knows who is looking.
export default function MatchEndedModal() {
  const params = useLocalSearchParams<{ role?: string }>();
  const role: EndedRole =
    params.role === 'blocker' || params.role === 'reporter' ? params.role : 'other';

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
      <Button label="Done" onPress={() => router.back()} />
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
  line: { textAlign: 'center', maxWidth: 280, lineHeight: 20 }
});
