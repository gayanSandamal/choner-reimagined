import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui/AppText';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/StateViews';
import { ChallengeCard } from '@/components/home/ChallengeCard';
import { WhyReminder } from '@/components/home/WhyReminder';
import { useSession } from '@/providers/session-provider';
import { useDefaultChallenges, useStreak } from '@/features/challenges/hooks';
import { usePendingInvites, usePartnerStatus } from '@/features/community/hooks';
import { useProfile } from '@/features/profile/hooks';
import { theme } from '@/constants/theme';
import { useTimeOfDay } from '@/lib/time-of-day';

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
  const challengesQ = useDefaultChallenges(userId);
  const streakQ = useStreak(userId);
  const invitesQ = usePendingInvites(userId);
  const partnerStatusQ = usePartnerStatus(userId);
  const { gradient: skyGradient, isEvening, timeLeftLabel } = useTimeOfDay();

  const soloChallenge = challengesQ.data?.solo ?? null;
  const partnerChallenge = challengesQ.data?.partner ?? null;
  const streak = streakQ.data ?? 0;

  // The invite still awaiting acceptance for the partner track, if any.
  const waitingInvite = partnerChallenge
    ? (invitesQ.data ?? []).find((i: any) => i.user_challenge_id === partnerChallenge.id)
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
  const avatarUri = profileQ.data?.avatar_url;

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={skyGradient as unknown as readonly [string, string, ...string[]]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
        >
          <AppText variant="title">
            {greetingFor()}{firstName ? `, ${firstName}` : ''}
          </AppText>

          {challengesQ.isLoading ? (
            <LoadingState />
          ) : challengesQ.isError ? (
            <ErrorState message={(challengesQ.error as Error).message} onRetry={() => challengesQ.refetch()} />
          ) : !soloChallenge && !partnerChallenge ? (
            <EmptyState
              title="Ready when you are"
              body="Choner works best with two. Invite a partner to start your first challenge."
              actionLabel="Invite a partner"
              onAction={() => router.push('/group/invite')}
            />
          ) : (
            <>
              {/* Above both fires: the reason is about the person, not the
                  track, and belongs where they see it before logging. */}
              <WhyReminder
                userId={userId}
                challenge={soloChallenge ?? partnerChallenge}
                dailyDeadline={profileQ.data?.daily_deadline}
              />
              {soloChallenge ? (
                <ChallengeCard
                  mode="solo"
                  challenge={soloChallenge}
                  streak={streak}
                  isEvening={isEvening}
                  timeLeftLabel={timeLeftLabel}
                  userName={fullName}
                  userAvatarUri={avatarUri}
                />
              ) : null}
              {partnerChallenge ? (
                <ChallengeCard
                  mode="partner"
                  challenge={partnerChallenge}
                  streak={streak}
                  isEvening={isEvening}
                  timeLeftLabel={timeLeftLabel}
                  userName={fullName}
                  userAvatarUri={avatarUri}
                  waitingPartnerEmail={waitingInvite?.email}
                  partnerStatus={partnerStatusQ.data}
                />
              ) : null}
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
  content: { padding: 20, paddingBottom: theme.spacing(4), gap: theme.spacing(2) }
});
