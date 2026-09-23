import { ScrollView, StyleSheet, Switch, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { LoadingState, ErrorState } from '@/components/ui/StateViews';
import { useActiveDirectory, useSetShowInDirectory } from '@/features/directory/hooks';
import { directoryLine } from '@/features/directory/format';
import { notify } from '@/lib/alert';
import { theme } from '@/constants/theme';

// "Who else is here" (handover §2.6). Social proof that real people are active
// — never a candidate list. Read-only on purpose: rows don't open profiles,
// there is no message or match action, and nobody is listed without opting in.
export default function WhoElseScreen() {
  const dirQ = useActiveDirectory();
  const setShow = useSetShowInDirectory();
  const dir = dirQ.data;

  const onToggle = async (next: boolean) => {
    try {
      await setShow.mutateAsync(next);
    } catch (error: any) {
      notify('Could not change that', error.message);
    }
  };

  return (
    <Screen scroll={false} contentStyle={styles.screen}>
      <ScreenHeader title="" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppText variant="title">Who else is here.</AppText>
        <AppText muted>Everyone active on Choner right now, across every activity.</AppText>

        {/* The opt-in lives where its effect is visible. */}
        <View style={styles.optIn}>
          <AppText style={styles.optInLabel}>Show me here too</AppText>
          <Switch
            value={Boolean(dir?.me_listed)}
            disabled={!dir || setShow.isPending}
            onValueChange={onToggle}
            trackColor={{ true: theme.colors.primary, false: theme.colors.border }}
            accessibilityLabel="Show me in Who else is here"
          />
        </View>

        {dirQ.isLoading ? (
          <LoadingState />
        ) : dirQ.isError ? (
          <ErrorState message={(dirQ.error as Error).message} onRetry={() => dirQ.refetch()} />
        ) : !dir?.visible ? (
          <AppText muted style={styles.quiet}>
            It's quiet here right now. Check back soon.
          </AppText>
        ) : (
          <View style={styles.list}>
            {dir.rows.map((row, i) => (
              <View key={`${row.first_name}-${i}`} style={styles.row}>
                <Avatar uri={row.avatar_url} name={row.first_name} size={40} />
                <View style={styles.rowText}>
                  <AppText style={styles.name}>{row.first_name}</AppText>
                  <AppText muted style={styles.detail}>{directoryLine(row)}</AppText>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, gap: 0 },
  content: { gap: theme.spacing(1.5), paddingBottom: theme.spacing(4) },
  optIn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface3,
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing(1.25),
    paddingHorizontal: theme.spacing(1.5),
    marginTop: theme.spacing(1)
  },
  optInLabel: { color: theme.colors.text, fontSize: 14 },
  quiet: { textAlign: 'center', marginTop: theme.spacing(4) },
  list: { gap: theme.spacing(1.25), marginTop: theme.spacing(1) },
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing(1.5) },
  rowText: { flexShrink: 1 },
  name: { color: theme.colors.text, fontSize: 14, fontFamily: theme.fonts.bodyMedium },
  detail: { fontSize: 12 }
});
