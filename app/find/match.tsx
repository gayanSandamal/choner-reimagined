import { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TopBarPill, useTopBarClearance } from '@/components/navigation/AppTopBar';
import { PressableScale } from '@/components/ui/PressableScale';
import { LoadingState } from '@/components/ui/StateViews';
import { MatchOffer } from '@/components/find/MatchOffer';
import { challengeHabitTitle } from '@/features/challenges/api';
import { useMyChallenge, useMyMatch } from '@/features/challenges/hooks';
import { useSession } from '@/providers/session-provider';
import { theme } from '@/constants/theme';

// Match found, as its own screen (#192). A back arrow on a navy bar, the offer
// under it, no tab bar.
//
// Back goes to the Find tab, which keeps working behind this: it says "Match
// found" where it said "Searching", and offers the other doors. Nothing is
// decided by leaving. The offer waits on its 24 hour clock either way.
export default function MatchFoundScreen() {
  const { session } = useSession();
  const userId = session?.user.id;
  const clearance = useTopBarClearance();
  const matchQ = useMyMatch(userId, true);
  const challengeQ = useMyChallenge(userId, true);
  const match = matchQ.data;
  const habit = challengeHabitTitle(challengeQ.data ?? null);

  const left = useRef(false);
  const back = () => {
    if (left.current) return;
    left.current = true;
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/find');
  };

  // The offer is gone: turned down, timed out, or accepted by you both. Each
  // of those is the Find tab's to show, so this screen steps aside.
  const gone = matchQ.isSuccess && !match?.matched;
  useEffect(() => {
    if (gone) back();
  }, [gone]);

  return (
    <SafeAreaView style={styles.root} edges={['bottom', 'left', 'right']}>
      <TopBarPill
        title={habit ? `Find: ${habit}` : 'Find'}
        left={
          <PressableScale onPress={back} hitSlop={10} accessibilityRole="button" accessibilityLabel="Back to Find">
            <Ionicons name="chevron-back" size={20} color={theme.colors.onNavy} />
          </PressableScale>
        }
      />
      {match?.matched ? (
        <MatchOffer
          match={match}
          challengeId={challengeQ.data?.id ?? null}
          onRefresh={() => {
            matchQ.refetch();
            back();
          }}
          topInset={clearance}
        />
      ) : (
        <LoadingState />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg }
});
