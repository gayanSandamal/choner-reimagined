import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PressableScale } from '@/components/ui/PressableScale';
import { LoadingState } from '@/components/ui/StateViews';
import {
  useJoinMatchPool,
  useLocations,
  useMyChallenge,
  useChallengeTemplate,
  useStartingPointStatus,
  useSetStartingPoint
} from '@/features/challenges/hooks';
import { StartingPointOverlay } from '@/components/challenges/StartingPointOverlay';
import { challengeHabitTitle } from '@/features/challenges/api';
import { isDailySearchLimit, isStartingPointRequired } from '@/features/challenges/api';
import { useSession } from '@/providers/session-provider';
import { theme } from '@/constants/theme';
import { notify } from '@/lib/alert';

type Mode = 'together' | 'separate';

const PACE_ACTIVITIES = ['running', 'cycling', 'walking'];

// State 2 of the Find tab. Collects only what matching needs and doesn't
// already know — everything about WHAT the challenge is was captured in
// onboarding and the Home prompt, and asking again reads as the app not
// listening.
export default function FindFormScreen() {
  const { session } = useSession();
  const userId = session?.user.id;
  const challengeQ = useMyChallenge(userId);
  const challenge = challengeQ.data as any;
  const templateQ = useChallengeTemplate(challenge?.challenge_template_id);
  const locationsQ = useLocations();
  const joinPool = useJoinMatchPool();
  const startingPointQ = useStartingPointStatus(challenge?.id);
  const setStartingPoint = useSetStartingPoint();

  // The spec's gate: a Find request can't be submitted without capability (or
  // a beginner's starting point) and commitment, because matching quality
  // depends on both.
  //
  // It has to be answerable HERE. Routing to the Home prompt instead is a dead
  // end for anyone who already tapped "Remind me tomorrow" that day — the
  // prompt is snoozed, so the one route to satisfying this gate is closed
  // until tomorrow. Every pre-existing challenge also starts with a null
  // commitment, so that is the common case, not an edge one.
  const [askStartingPoint, setAskStartingPoint] = useState(false);
  const startingPointAnswered = startingPointQ.data?.answered ?? true;

  const template = templateQ.data as any;
  const activityKey: string | null = template?.activity_key ?? null;
  // Badminton is always together, Home workouts always separate — the
  // activity decides, so the question is replaced by a plain statement.
  const forcedMode: Mode | null = template?.forced_mode ?? null;

  const [mode, setMode] = useState<Mode>(forcedMode ?? 'separate');
  const [genderPreference, setGenderPreference] =
    useState<'no_preference' | 'same_gender_only'>('no_preference');
  const [location, setLocation] = useState<string | null>(challenge?.preferred_location ?? null);
  const [locationQuery, setLocationQuery] = useState('');
  const [pace, setPace] = useState<'slow' | 'moderate' | 'fast' | null>(null);
  const [skill, setSkill] = useState<'beginner' | 'casual' | 'intermediate' | 'advanced' | null>(null);
  const [courtAccess, setCourtAccess] = useState<string | null>(null);
  const [bikeAccess, setBikeAccess] = useState<string | null>(null);

  const effectiveMode = forcedMode ?? mode;
  const inPerson = effectiveMode === 'together';

  const locations = locationsQ.data ?? [];
  const filteredLocations = useMemo(() => {
    const q = locationQuery.trim().toLowerCase();
    if (!q) return locations;
    return locations.filter((l) => l.label.toLowerCase().includes(q));
  }, [locations, locationQuery]);

  const selectedLabel = locations.find((l) => l.value === location)?.label ?? null;

  const showPace = inPerson && PACE_ACTIVITIES.includes(activityKey ?? '');
  const showBadminton = activityKey === 'badminton';
  const showBike = activityKey === 'cycling';

  const canSubmit = Boolean(challenge?.id) && (!inPerson || Boolean(location));

  const join = async () => {
    if (!challenge?.id) return;
    await joinPool.mutateAsync({
      userChallengeId: challenge.id,
      mode: effectiveMode,
      preferredLocation: inPerson ? location : null,
      genderPreference,
      pace: showPace ? pace : null,
      skillLevel: showBadminton ? skill : null,
      courtAccess: showBadminton ? courtAccess : null,
      bikeAccess: showBike ? bikeAccess : null
    });
    router.replace('/(tabs)/find');
  };

  const onSubmit = async () => {
    if (!challenge?.id) return;
    // Ask here rather than bouncing away; the join retries once it's answered.
    if (!startingPointAnswered) {
      setAskStartingPoint(true);
      return;
    }
    try {
      await join();
    } catch (error: any) {
      if (isStartingPointRequired(error)) {
        setAskStartingPoint(true);
        return;
      }
      if (isDailySearchLimit(error)) {
        notify(
          "That's today's searches",
          'You get three partner searches a day. Try again tomorrow, or invite someone you know.'
        );
        return;
      }
      notify('Could not start looking', error.message);
    }
  };

  if (challengeQ.isLoading || templateQ.isLoading) {
    return (
      <SafeAreaView style={styles.root}>
        <LoadingState />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.topbar}>
        <PressableScale
          onPress={() => router.back()}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={styles.backSlot}
        >
          <Ionicons name="chevron-back" size={20} color={theme.colors.onNavy} />
        </PressableScale>
        <AppText style={styles.topbarTitle}>Find</AppText>
        <View style={styles.backSlot} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <AppText variant="label" muted style={styles.eyebrow}>
          Find a partner{template?.title ? ` · ${template.title}` : ''}
        </AppText>
        <AppText variant="title">
          A few last{' '}
          <AppText variant="title" style={styles.emphasis}>
            details
          </AppText>
        </AppText>
        <AppText muted style={styles.sub}>
          So we find someone you can actually show up with.
        </AppText>

        {/* Mode — replaced by a statement when the activity forces it. */}
        <AppText style={styles.fieldLabel}>How do you want to do this?</AppText>
        {forcedMode ? (
          <View style={styles.statement}>
            <AppText variant="caption" muted>
              {forcedMode === 'together'
                ? `${template?.title ?? 'This'} is something you do together, so we'll only match you with someone you can meet.`
                : `${template?.title ?? 'This'} is your own session — you'll each check in after.`}
            </AppText>
          </View>
        ) : (
          <>
            <Choice
              title="Together"
              detail="Meet in person"
              active={mode === 'together'}
              onPress={() => setMode('together')}
            />
            <Choice
              title="Separately"
              detail="Own session, check in after"
              active={mode === 'separate'}
              onPress={() => setMode('separate')}
            />
          </>
        )}

        <AppText style={styles.fieldLabel}>Gender preference</AppText>
        <View style={styles.pillRow}>
          <Pill
            label="No preference"
            active={genderPreference === 'no_preference'}
            onPress={() => setGenderPreference('no_preference')}
          />
          <Pill
            label="Same gender only"
            active={genderPreference === 'same_gender_only'}
            onPress={() => setGenderPreference('same_gender_only')}
          />
        </View>

        {/* Location only matters when actually meeting up. */}
        {inPerson ? (
          <>
            <AppText style={styles.fieldLabel}>Your area</AppText>
            <Input
              placeholder={selectedLabel ?? 'Search your area'}
              value={locationQuery}
              onChangeText={setLocationQuery}
            />
            <View style={styles.pillRow}>
              {filteredLocations.slice(0, 12).map((l) => (
                <Pill
                  key={l.value}
                  label={l.label}
                  active={location === l.value}
                  onPress={() => {
                    setLocation(l.value);
                    setLocationQuery('');
                  }}
                />
              ))}
              {filteredLocations.length === 0 ? (
                <AppText variant="caption" muted>
                  No area matches “{locationQuery}”.
                </AppText>
              ) : null}
            </View>
          </>
        ) : null}

        {showPace || showBadminton || showBike ? (
          <AppText variant="label" muted style={styles.sectionLabel}>
            {inPerson ? "Because you're meeting in person" : 'About your setup'}
          </AppText>
        ) : null}

        {showPace ? (
          <>
            <AppText style={styles.fieldLabel}>Typical pace</AppText>
            <View style={styles.pillRow}>
              {(['slow', 'moderate', 'fast'] as const).map((p) => (
                <Pill
                  key={p}
                  label={p[0].toUpperCase() + p.slice(1)}
                  active={pace === p}
                  onPress={() => setPace(p)}
                />
              ))}
            </View>
          </>
        ) : null}

        {showBadminton ? (
          <>
            <AppText style={styles.fieldLabel}>Skill level</AppText>
            <View style={styles.pillRow}>
              {(['beginner', 'casual', 'intermediate', 'advanced'] as const).map((s) => (
                <Pill
                  key={s}
                  label={s[0].toUpperCase() + s.slice(1)}
                  active={skill === s}
                  onPress={() => setSkill(s)}
                />
              ))}
            </View>
            <AppText style={styles.fieldLabel}>Court access</AppText>
            <View style={styles.pillRow}>
              {[
                ['have_regular_court', 'Have a regular court'],
                ['can_book', 'Can book'],
                ['need_partner_to_arrange', 'Need partner to arrange']
              ].map(([value, label]) => (
                <Pill
                  key={value}
                  label={label}
                  active={courtAccess === value}
                  onPress={() => setCourtAccess(value)}
                />
              ))}
            </View>
          </>
        ) : null}

        {showBike ? (
          <>
            <AppText style={styles.fieldLabel}>Bike access</AppText>
            <View style={styles.pillRow}>
              {[
                ['own_bike', 'Own bike'],
                ['rental', 'Rental'],
                ['stationary', 'Stationary'],
                ['none_yet', 'None yet']
              ].map(([value, label]) => (
                <Pill
                  key={value}
                  label={label}
                  active={bikeAccess === value}
                  onPress={() => setBikeAccess(value)}
                />
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label="Start looking"
          disabled={!canSubmit}
          loading={joinPool.isPending}
          onPress={onSubmit}
        />
      </View>

      {askStartingPoint && startingPointQ.data ? (
        <StartingPointOverlay
          status={startingPointQ.data}
          habitTitle={challengeHabitTitle(challenge)}
          busy={setStartingPoint.isPending || joinPool.isPending}
          onSubmit={async (answer) => {
            try {
              await setStartingPoint.mutateAsync({
                userChallengeId: challenge.id,
                capability: answer.capability ?? null,
                beginnerStart: answer.beginnerStart ?? null,
                commitment: answer.commitment
              });
              setAskStartingPoint(false);
              // Straight on into the search they actually asked for, rather
              // than making them press "Start looking" a second time.
              await join();
            } catch (error: any) {
              setAskStartingPoint(false);
              notify('Could not save that', error.message);
            }
          }}
          onDismiss={() => setAskStartingPoint(false)}
        />
      ) : null}
    </SafeAreaView>
  );
}

function Choice({
  title,
  detail,
  active,
  onPress
}: {
  title: string;
  detail: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <PressableScale
      onPress={onPress}
      scaleTo="subtle"
      haptic="selection"
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`${title}. ${detail}`}
      style={[styles.choice, active && styles.choiceActive]}
    >
      <AppText style={styles.choiceTitle}>{title}</AppText>
      <AppText variant="caption" muted>
        {detail}
      </AppText>
    </PressableScale>
  );
}

function Pill({
  label,
  active,
  onPress
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <PressableScale
      onPress={onPress}
      scaleTo="subtle"
      haptic="selection"
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      style={[styles.pill, active && styles.pillActive]}
    >
      <AppText style={[styles.pillLabel, active && styles.pillLabelActive]}>{label}</AppText>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.navy,
    borderRadius: 24,
    marginHorizontal: 16,
    marginTop: 14,
    paddingHorizontal: 20,
    paddingVertical: 16,
    ...theme.shadow.lg
  },
  backSlot: { width: 20 },
  topbarTitle: { color: theme.colors.onNavy, fontFamily: theme.fonts.bodyBold, fontSize: 16 },
  content: { padding: 20, gap: theme.spacing(1), paddingBottom: theme.spacing(4) },
  eyebrow: { textTransform: 'uppercase', letterSpacing: 1 },
  emphasis: { fontFamily: theme.fonts.bodyBold },
  sub: { marginBottom: theme.spacing(1.5) },
  sectionLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: theme.spacing(1.5)
  },
  fieldLabel: {
    fontFamily: theme.fonts.bodyMedium,
    fontSize: 12.5,
    color: theme.colors.text,
    marginTop: theme.spacing(1)
  },
  statement: {
    backgroundColor: theme.colors.surface3,
    borderRadius: theme.radius.sm,
    padding: theme.spacing(1.5)
  },
  choice: {
    backgroundColor: theme.colors.surface,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    padding: theme.spacing(2),
    gap: 2,
    ...theme.shadow.sm
  },
  choiceActive: { borderColor: theme.colors.primary2 },
  choiceTitle: { fontFamily: theme.fonts.bodyMedium, fontSize: 14, color: theme.colors.text },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: theme.radius.pill,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface
  },
  pillActive: { borderColor: 'transparent', backgroundColor: theme.colors.primary },
  pillLabel: { fontSize: 13, color: theme.colors.text, fontFamily: theme.fonts.bodyMedium },
  pillLabelActive: { color: '#FFFFFF' },
  footer: { padding: 20, paddingTop: theme.spacing(1) }
});
