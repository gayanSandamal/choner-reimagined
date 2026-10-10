import { useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PressableScale } from '@/components/ui/PressableScale';
import { Icon } from '@/components/ui/Icon';
import { LoadingState } from '@/components/ui/StateViews';
import {
  useJoinMatchPool,
  useLocations,
  useMyChallenge,
  useChallengeTemplate
} from '@/features/challenges/hooks';
import { isDailySearchLimit } from '@/features/challenges/api';
import { useSession } from '@/providers/session-provider';
import { theme } from '@/constants/theme';
import { notify } from '@/lib/alert';

type Mode = 'together' | 'separate' | 'either';

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
  const [skill, setSkill] = useState<'beginner' | 'casual' | 'intermediate' | 'advanced' | null>(null);
  const [courtAccess, setCourtAccess] = useState<string | null>(null);
  const [bikeAccess, setBikeAccess] = useState<string | null>(null);

  // useState only reads its initial value on the first render, which happens
  // before the challenge has loaded — so every saved answer came back blank
  // and "Edit answers" meant answering from scratch. Prefill once, when the
  // row arrives, and never over something the user has already changed.
  const prefilled = useRef(false);
  useEffect(() => {
    if (prefilled.current || !challenge) return;
    prefilled.current = true;
    if (!forcedMode && (challenge.mode === 'together' || challenge.mode === 'separate' || challenge.mode === 'either')) {
      setMode(challenge.mode);
    }
    if (challenge.gender_preference) setGenderPreference(challenge.gender_preference);
    if (challenge.preferred_location) setLocation(challenge.preferred_location);
    if (challenge.skill_level) setSkill(challenge.skill_level);
    if (challenge.court_access) setCourtAccess(challenge.court_access);
    if (challenge.bike_access) setBikeAccess(challenge.bike_access);
  }, [challenge, forcedMode]);

  const effectiveMode = forcedMode ?? mode;
  // Either might end up meeting, so it needs an area just like Together.
  const inPerson = effectiveMode !== 'separate';

  const locations = locationsQ.data ?? [];
  // Suggestions only once they start typing, as in the prototype; an empty
  // query shows none rather than the whole list of areas.
  const suggestions = useMemo(() => {
    const q = locationQuery.trim().toLowerCase();
    if (!q) return [];
    return locations.filter((l) => l.label.toLowerCase().includes(q)).slice(0, 6);
  }, [locations, locationQuery]);

  const selectedLabel = locations.find((l) => l.value === location)?.label ?? null;

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
      // No pace question any more (#106): it is agreed with the partner after
      // matching. null leaves whatever an older search saved untouched.
      pace: null,
      skillLevel: showBadminton ? skill : null,
      courtAccess: showBadminton ? courtAccess : null,
      bikeAccess: showBike ? bikeAccess : null
    });
    router.replace('/(tabs)/find');
  };

  const onSubmit = async () => {
    if (!challenge?.id) return;
    // No "Where are you starting from?" before searching (#107): on the weekly
    // model distance and pace are agreed after matching.
    try {
      await join();
    } catch (error: any) {
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
          Find a partner{template?.title ? `, ${template.title}` : ''}
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
                : `${template?.title ?? 'This'} is your own session, and you'll each check in after.`}
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
            <Choice
              title="Either works"
              detail="Decide together once you're matched"
              active={mode === 'either'}
              onPress={() => setMode('either')}
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
            {/* The prototype's location picker (#105): the chosen area is a
                gradient chip you can close; typing shows a few suggestions.
                The old version listed every area as a pill. One area, because
                the match pool keeps one preferred location per challenge. */}
            <AppText style={styles.fieldLabel}>Your area</AppText>
            {location && selectedLabel ? (
              <View style={styles.pillRow}>
                <LinearGradient
                  colors={theme.gradients.warm as unknown as readonly [string, string]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.areaChip}
                >
                  <AppText style={styles.areaChipLabel}>{selectedLabel}</AppText>
                  <PressableScale
                    onPress={() => setLocation(null)}
                    haptic="selection"
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${selectedLabel}`}
                    style={styles.areaChipX}
                  >
                    <Icon name="x" size={12} color="#FFFFFF" strokeWidth={2.4} />
                  </PressableScale>
                </LinearGradient>
              </View>
            ) : (
              <>
                <Input
                  placeholder="Type an area"
                  value={locationQuery}
                  onChangeText={setLocationQuery}
                  autoCorrect={false}
                />
                {suggestions.length ? (
                  <View style={styles.suggest}>
                    {suggestions.map((l, i) => (
                      <PressableScale
                        key={l.value}
                        onPress={() => {
                          setLocation(l.value);
                          setLocationQuery('');
                          Keyboard.dismiss();
                        }}
                        haptic="selection"
                        accessibilityRole="button"
                        style={[styles.suggestRow, i > 0 && styles.suggestDivider]}
                      >
                        <AppText style={styles.suggestLabel}>{l.label}</AppText>
                      </PressableScale>
                    ))}
                  </View>
                ) : locationQuery.trim() ? (
                  <AppText variant="caption" muted>
                    No area matches “{locationQuery.trim()}”.
                  </AppText>
                ) : null}
              </>
            )}
          </>
        ) : null}

        {showBadminton || showBike ? (
          <AppText variant="label" muted style={styles.sectionLabel}>
            {inPerson ? "Because you're meeting in person" : 'About your setup'}
          </AppText>
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
      style={[active ? styles.pillActive : styles.pill]}
    >
      {/* The prototype's .pill.on swaps the BACKGROUND (choner-find-flow.html
          :139-140). Drawing the gradient as an absoluteFill child instead
          meant the pill had to clip it, and overflow:'hidden' + a 999 radius
          + elevation squared the corners off on Android — but only while
          selected, because that was the only state that clipped (#120).
          The gradient is the surface now, so nothing clips. */}
      {active ? (
        <LinearGradient
          colors={theme.gradients.warm as unknown as readonly [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.pillFill}
        >
          <AppText style={[styles.pillLabel, styles.pillLabelActive]}>{label}</AppText>
        </LinearGradient>
      ) : (
        <AppText style={styles.pillLabel}>{label}</AppText>
      )}
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
  // Selected keeps the same 1.5 border, transparent, so the box is identical
  // in both states and the row cannot reflow on selection.
  pillActive: {
    borderRadius: theme.radius.pill,
    borderWidth: 1.5,
    borderColor: 'transparent',
    ...theme.shadow.glow,
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 }
  },
  pillFill: {
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: theme.radius.pill
  },
  areaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: theme.radius.pill,
    paddingVertical: 8,
    paddingLeft: 14,
    paddingRight: 8
  },
  areaChipLabel: { color: '#FFFFFF', fontSize: 13, fontFamily: theme.fonts.bodyMedium },
  areaChipX: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  suggest: {
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden'
  },
  suggestRow: { paddingVertical: 12, paddingHorizontal: 16 },
  suggestDivider: { borderTopWidth: 1, borderTopColor: theme.colors.border },
  suggestLabel: { fontSize: 13.5, color: theme.colors.text },
  pillLabel: { fontSize: 13, color: theme.colors.text, fontFamily: theme.fonts.bodyMedium },
  pillLabelActive: { color: '#FFFFFF' },
  footer: { padding: 20, paddingTop: theme.spacing(1) }
});
