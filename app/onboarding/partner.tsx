import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/Card';
import { OptionCard } from '@/components/onboarding/OptionCard';
import { useOnboarding } from '@/features/onboarding/context';
import { useIsInvitee } from '@/features/onboarding/invitee';
import { challengeHabitTitle } from '@/features/challenges/api';
import { useMyChallenge } from '@/features/challenges/hooks';
import { useSession } from '@/providers/session-provider';
import { theme } from '@/constants/theme';

type Choice = 'invite' | 'find';

// The last onboarding screen, and a handoff rather than a flow.
//
// Onboarding does not run a search and does not send an invite: both belong to
// the Find tab, which owns every partner path. Picking a card and tapping
// Continue ends onboarding on Find's own top screen, where all three doors
// (the radar, "Invite someone you know", "Have an invite code?") are visible
// and the choice is made where it belongs.
//
// Select-then-Continue on purpose. A single tap must never launch a partner
// search by accident, and every other onboarding screen works this way.
//
// There is no Solo card. The line under the heading carries the nudge instead.
export default function PartnerChoiceScreen() {
  const { session } = useSession();
  const userId = session?.user.id;
  const { chosenChallenge } = useOnboarding();
  const challengeQ = useMyChallenge(userId);
  const { isInvitee } = useIsInvitee(userId);

  const [choice, setChoice] = useState<Choice | null>(null);

  const habit = chosenChallenge?.title ?? challengeHabitTitle(challengeQ.data ?? null);

  // Someone who arrived through an invite already has a partner and must never
  // be asked to find or invite one.
  useEffect(() => {
    if (isInvitee) router.replace('/challenge/why');
  }, [isInvitee]);

  const onContinue = () => {
    if (!choice) return;
    // TODO: when Find is rebuilt it should accept an intent so "Invite someone
    // you know" opens its invite sheet directly. Until then both cards land on
    // Find's top screen, which carries both doors anyway.
    router.replace('/(tabs)/find');
  };

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(360)} style={styles.header}>
          <AppText variant="label" muted>
            Your first challenge
          </AppText>
          <AppText variant="title">How do you want to do this?</AppText>
          <AppText variant="caption" muted>
            Choner works better when someone is counting on you.
          </AppText>
        </Animated.View>

        {habit ? (
          <Animated.View entering={FadeInDown.delay(80).duration(360)}>
            <Card>
              <AppText variant="subtitle">{habit}</AppText>
            </Card>
          </Animated.View>
        ) : null}

        <Animated.View entering={FadeInDown.delay(140).duration(360)} style={styles.options}>
          <OptionCard
            layout="row"
            icon="together"
            label="Invite someone you know"
            description="A friend or sibling, anyone on the same path."
            selected={choice === 'invite'}
            onPress={() => setChoice('invite')}
          />
          <OptionCard
            layout="row"
            icon="user"
            label="Find the right partner"
            description="We'll match you with someone who wants the same thing."
            selected={choice === 'find'}
            onPress={() => setChoice('find')}
          />
        </Animated.View>
      </ScrollView>

      <Animated.View entering={FadeInDown.delay(220).duration(360)} style={styles.footer}>
        <Button label="Continue" disabled={!choice} onPress={onContinue} />
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: 20, paddingTop: theme.spacing(2), gap: theme.spacing(2.5), flexGrow: 1 },
  header: { gap: theme.spacing(1) },
  options: { gap: theme.spacing(1.5) },
  footer: { padding: 20, paddingTop: theme.spacing(1) }
});
