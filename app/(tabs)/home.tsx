import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppTopBar } from '@/components/navigation/AppTopBar';
import { AppText } from '@/components/ui/AppText';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/StateViews';
import { ChallengeCard } from '@/components/home/ChallengeCard';
import { WhyReminder } from '@/components/home/WhyReminder';
import { SharePrompt } from '@/components/community/SharePrompt';
import { useSession } from '@/providers/session-provider';
import { useMyChallenge, useStreak } from '@/features/challenges/hooks';
import { usePendingInvites, usePartnerStatus } from '@/features/community/hooks';
import { useProfile } from '@/features/profile/hooks';
import { theme } from '@/constants/theme';

function greetingFor(date = new Date()) {
  const h = date.getHours();
  if (h < 5) return 'Up late';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Good night';
}

export default function HomeScreen() {
  const { session } = useSession();
  const userId = session?.user.id;
  const profileQ = useProfile(userId);
  const challengesQ = useMyChallenge(userId);
  const streakQ = useStreak(userId);
  const invitesQ = usePendingInvites(userId);
  const partnerStatusQ = usePartnerStatus(userId);

  // One challenge now, with a partner slot on it rather than a second row.
  const challenge = challengesQ.data ?? null;
  const streak = streakQ.data ?? 0;

  // The invite still awaiting acceptance, if the partner half is 'invited'.
  const waitingInvite = challenge
    ? (invitesQ.data ?? []).find((i: any) => i.user_challenge_id === challenge.id)
    : undefined;

  const refreshing = challengesQ.isRefetching || profileQ.isRefetching;
  const onRefresh = () => {
    challengesQ.refetch();
    streakQ.refetch();
    profileQ.refetch();
    invitesQ.refetch();
    partnerStatusQ.refetch();
  };

  const fullName = profileQ.data?.full_name;
  const firstName = fullName?.split(' ')[0];

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <AppTopBar />
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
        >
          {/* Time-of-day greeting above the name, per spec: the muted line
              carries the time, the name carries the weight. */}
          <View style={styles.greeting}>
            <AppText variant="caption" muted>
              {greetingFor()}
            </AppText>
            {firstName ? <AppText style={styles.name}>{firstName}</AppText> : null}
          </View>

          {challengesQ.isLoading ? (
            <LoadingState />
          ) : challengesQ.isError ? (
            <ErrorState message={(challengesQ.error as Error).message} onRetry={() => challengesQ.refetch()} />
          ) : !challenge ? (
            <EmptyState
              title="Ready when you are"
              body="Pick a challenge, then find someone to do it with."
              actionLabel="Choose a challenge"
              onAction={() => router.push('/challenge/browse')}
            />
          ) : (
            <>
              {/* Above the card: the reason is about the person, not the
                  challenge, and belongs where they see it before logging. */}
              <WhyReminder
                userId={userId}
                challenge={challenge}
                dailyDeadline={profileQ.data?.daily_deadline}
              />
              <ChallengeCard
                challenge={challenge}
                streak={streak}
                userName={fullName}
                waitingPartnerEmail={waitingInvite?.email}
                partnerStatus={partnerStatusQ.data}
              />
              {/* Offered here as well as on Challenges — whichever screen the
                  user happens to be on when the moment lands. */}
              <SharePrompt userId={userId} challenge={challenge} streak={streak} />
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  safe: { flex: 1 },
  content: { padding: 20, paddingTop: theme.spacing(1), paddingBottom: theme.spacing(4), gap: theme.spacing(2) },
  greeting: { gap: 2 },
  name: { fontFamily: theme.fonts.body, fontSize: 21, color: theme.colors.text }
});
