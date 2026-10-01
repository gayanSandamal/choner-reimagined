import { useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Switch, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { LoadingState, ErrorState } from '@/components/ui/StateViews';
import type { DirectoryRow } from '@/features/directory/api';
import { useActiveDirectory, useSetShowInDirectory } from '@/features/directory/hooks';
import { DIRECTORY_PAGE, directoryExercises, directoryLine, directoryPage } from '@/features/directory/format';
import { notify } from '@/lib/alert';
import { theme } from '@/constants/theme';

// "Already on the move": proof that real people are here, never a candidate
// list. Read-only on purpose: a card does not open a profile, and there is no
// message or match action.
//
// Six cards to a screen, each standing apart rather than a joined list. No
// location on any of them: without it this is a first name and an activity,
// not a way to find someone in person.
export default function WhoElseScreen() {
  const dirQ = useActiveDirectory();
  const setShow = useSetShowInDirectory();
  const dir = dirQ.data;
  const [pages, setPages] = useState(1);
  const rows = directoryPage(dir?.rows ?? [], pages);

  const onToggle = async (next: boolean) => {
    try {
      await setShow.mutateAsync(next);
    } catch (error: any) {
      notify('Could not change that', error.message);
    }
  };

  const header = (
    <View style={styles.head}>
      <AppText variant="title">Already on the move.</AppText>
      <AppText muted>People with a commitment on Choner right now, across every activity.</AppText>
      {/* An opt-OUT, and it lives where its effect is visible. */}
      <View style={styles.optIn}>
        <AppText style={styles.optInLabel}>Show me here too</AppText>
        <Switch
          value={Boolean(dir?.me_listed)}
          disabled={!dir || setShow.isPending}
          onValueChange={onToggle}
          trackColor={{ true: theme.colors.primary, false: theme.colors.border }}
          accessibilityLabel="Show me in Already on the move"
        />
      </View>
    </View>
  );

  return (
    <Screen scroll={false} contentStyle={styles.screen}>
      <ScreenHeader title="" onBack={() => router.back()} />
      {dirQ.isLoading ? (
        <>
          {header}
          <LoadingState />
        </>
      ) : dirQ.isError ? (
        <>
          {header}
          <ErrorState message={(dirQ.error as Error).message} onRetry={() => dirQ.refetch()} />
        </>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(row, i) => `${row.first_name}-${i}`}
          renderItem={({ item }) => <PersonCard row={item} />}
          ListHeaderComponent={header}
          // The spinner at the end never resolves, and that is deliberate: it
          // is a small lie so a short list still feels alive. It is not a
          // hang, and there is nothing behind it to wait for.
          ListFooterComponent={
            <View style={styles.footer} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <ActivityIndicator color={theme.colors.muted} />
            </View>
          }
          ItemSeparatorComponent={() => <View style={styles.gap} />}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (rows.length < (dir?.rows.length ?? 0)) setPages((p) => p + 1);
          }}
          initialNumToRender={DIRECTORY_PAGE}
        />
      )}
    </Screen>
  );
}

function PersonCard({ row }: { row: DirectoryRow }) {
  const exercises = directoryExercises(row);
  return (
    <View style={styles.card}>
      <Avatar uri={row.avatar_url} name={row.first_name} size={44} />
      <View style={styles.cardText}>
        <AppText style={styles.name}>{row.first_name}</AppText>
        <AppText muted style={styles.detail}>{directoryLine(row)}</AppText>
        {/* Workout rows only. This is the one place exercises are shown. */}
        {exercises ? <AppText muted style={styles.detail}>{exercises}</AppText> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, gap: 0 },
  head: { gap: theme.spacing(1.5), marginBottom: theme.spacing(2) },
  content: { paddingBottom: theme.spacing(4) },
  optIn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface3,
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing(1.25),
    paddingHorizontal: theme.spacing(1.5)
  },
  optInLabel: { color: theme.colors.text, fontSize: 14 },
  gap: { height: 10 },
  // A fixed height, so six of them make a screen whatever a row carries.
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(1.5),
    minHeight: 76,
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  cardText: { flexShrink: 1 },
  name: { color: theme.colors.text, fontSize: 15, fontFamily: theme.fonts.bodyMedium },
  detail: { fontSize: 12.5, lineHeight: 18 },
  footer: { paddingVertical: theme.spacing(3), alignItems: 'center' }
});
