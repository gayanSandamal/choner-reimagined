import { Linking, Pressable, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { AppText } from '@/components/ui/AppText';
import { theme } from '@/constants/theme';
import { notify } from '@/lib/alert';

// This screen and https://choner.io/privacy.html have to say the same thing.
// The hosted page is the one Google Play and the App Store read, and a
// reviewer who finds the two disagreeing has found a reason to reject the
// listing. So: only name what the shipped build actually collects.
//
// An earlier version of this screen claimed "basic device telemetry used to
// deliver notifications and diagnose crashes", "app version" and "crash
// reports and anonymized analytics events". None of that was true. Sentry and
// PostHog are installed but every call in lib/observability.ts is gated behind
// EXPO_PUBLIC_SENTRY_DSN and EXPO_PUBLIC_POSTHOG_KEY, neither of which the
// production build sets, so nothing is collected and the Play Data safety form
// declares none of it. It also mentioned community posts and comments, which
// no screen in the app reaches.
//
// If observability is ever switched on, or posts ship, this screen, the hosted
// policy and the Data safety declaration all change in the same pull request.
const FULL_POLICY_URL = 'https://choner.io/privacy.html';

export default function PrivacyScreen() {
  const openFullPolicy = () => {
    Linking.openURL(FULL_POLICY_URL).catch(() =>
      notify('Could not open', 'Read the full policy at choner.io/privacy.html')
    );
  };

  return (
    <Screen scroll={false}>
      <ScrollView contentContainerStyle={{ gap: theme.spacing(2), paddingBottom: theme.spacing(4) }}>
        <ScreenHeader title="Privacy Policy" onBack={() => router.back()} />
        <AppText variant="caption" muted>Last updated: 2026-11-09</AppText>
        <AppText>
          Choner ("we", "us") collects only what it needs to pair you with someone and keep the two
          of you showing up: the account details you give us, the profile answers you choose, the
          area you pick, and what you do in the app. We do not sell your data.
        </AppText>
        <AppText variant="subtitle">What we collect</AppText>
        <AppText muted>
          • Account: email, full name.{'\n'}
          • Profile: age range, gender, your goal, what has stopped you before, the kind of
          accountability you respond to, how you said you were feeling when you joined, and your
          photo if you add one.{'\n'}
          • Area: the neighbourhood you pick so we can match you with someone nearby. A
          neighbourhood, never your exact position.{'\n'}
          • Activity: challenges you start, sessions you plan, what you complete and what you
          miss.{'\n'}
          • What you write: your reasons for starting, messages to your partner, a meeting place you
          suggest, the reason you give for a missed day, and a milestone you choose to share with
          your city.{'\n'}
          • Check-in photos, if you send one to your partner.{'\n'}
          • Safety: reports you send about another user (the category and anything you write), and
          the people you have blocked.{'\n'}
          • Device: a push notification token and your OS platform, so a notification can reach the
          right phone.
        </AppText>
        <AppText variant="subtitle">What we do not collect</AppText>
        <AppText muted>
          The app does not ask for or read your device location. It does not collect crash reports,
          analytics or usage events, and it has no advertising identifier. There is no AI in Choner
          and nothing you write is sent to an AI company. If any of that changes we will say so here
          before it does.
        </AppText>
        <AppText variant="subtitle">What your partner sees</AppText>
        <AppText muted>
          Your first name, your photo if you added one, the activity you both agreed, the area you
          chose, and whether you showed up. Once you are partners, they can also read the reasons
          you gave for starting. They do not see your email address, your full name unless you used
          it as your name, or anything you have reported.
        </AppText>
        <AppText variant="subtitle">How long we keep it</AppText>
        <AppText muted>
          Check-in photos are deleted as soon as your partner has seen them, and in every case
          within 7 days. Match offers expire after 24 hours and invitations after 48. Your account
          and its history are kept while the account exists, so your streak still means something.
        </AppText>
        <AppText variant="subtitle">Who else processes it</AppText>
        <AppText muted>
          Supabase stores your account, profile and activity, hosted in Singapore. Resend sends our
          emails. Apple and Google deliver push notifications if you turn them on. Nobody else
          handles your data.
        </AppText>
        <AppText variant="subtitle">Reports and blocks</AppText>
        <AppText muted>
          A report is read by a person on our team, and sending one also ends your match. The person
          you report or block is never told who did it or why. They only see that the match has
          ended. Reports are kept so we can act on them; blocks are kept so you are never matched
          with that person again.
        </AppText>
        <AppText variant="subtitle">Your rights</AppText>
        <AppText muted>
          You can export or permanently delete your account at any time from Settings, then Delete
          account. Email hello@choner.io for any data request, including a copy of what we hold.
        </AppText>
        <Pressable onPress={openFullPolicy} accessibilityRole="link">
          <AppText style={{ color: theme.colors.link, textDecorationLine: 'underline' }}>
            Read the full policy at choner.io/privacy.html
          </AppText>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}
