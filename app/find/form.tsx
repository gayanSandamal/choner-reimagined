import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TopBarPill, useTopBarClearance } from '@/components/navigation/AppTopBar';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/button';
import { PressableScale } from '@/components/ui/PressableScale';
import { Icon } from '@/components/ui/Icon';
import { LoadingState } from '@/components/ui/StateViews';
import { KeyboardFooterScroll } from '@/components/ui/keyboard';
import {
  useJoinMatchPool,
  useLocations,
  useMyChallenge,
  useChallengeTemplate
} from '@/features/challenges/hooks';
import type { LocationRow } from '@/features/challenges/locations';
import { isDailySearchLimit } from '@/features/challenges/api';
import { useSession } from '@/providers/session-provider';
import { theme } from '@/constants/theme';
import { notify } from '@/lib/alert';

type Mode = 'together' | 'separate' | 'either';

// State 2 of the Find tab. Collects only what matching needs and doesn't
// already know — everything about WHAT the challenge is was captured in
// onboarding and the Home prompt, and asking again reads as the app not
// listening.
// Maximum areas per challenge. Two columns on user_challenges enforce the
// same number server-side, so this constant and the schema have to agree.
const MAX_AREAS = 2;

// The two headings the picker is split under, as the prototype writes them
// (docs/prototypes/src/app_b.js:186). The table stores the key; only the
// display name lives here.
const GROUP_TITLES: Record<LocationRow['location_group'], string> = {
  colombo_city: 'Colombo city',
  greater_colombo: 'Greater Colombo'
};

export default function FindFormScreen() {
  const { session } = useSession();
  const userId = session?.user.id;
  const challengeQ = useMyChallenge(userId);
  const challenge = challengeQ.data as any;
  const templateQ = useChallengeTemplate(challenge?.challenge_template_id);
  const locationsQ = useLocations();
  const clearance = useTopBarClearance();
  const joinPool = useJoinMatchPool();

  const template = templateQ.data as any;
  const activityKey: string | null = template?.activity_key ?? null;
  // Badminton is always together, Home workouts always separate — the
  // activity decides, so the question is replaced by a plain statement.
  const forcedMode: Mode | null = template?.forced_mode ?? null;

  const [mode, setMode] = useState<Mode>(forcedMode ?? 'separate');
  const [genderPreference, setGenderPreference] =
    useState<'no_preference' | 'same_gender_only'>('no_preference');
  // Up to TWO areas (#140). An ordered list rather than two variables,
  // because the chips, the picker's own list and the submit all want to treat
  // it as a set, and the cap then lives in exactly one place.
  const [picked, setPicked] = useState<string[]>(
    [challenge?.preferred_location, (challenge as any)?.preferred_location_2].filter(
      Boolean
    ) as string[]
  );
  const [pickerOpen, setPickerOpen] = useState(false);
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
    const stored = [
      challenge.preferred_location,
      (challenge as any).preferred_location_2
    ].filter(Boolean) as string[];
    if (stored.length) setPicked(stored);
    if (challenge.skill_level) setSkill(challenge.skill_level);
    if (challenge.court_access) setCourtAccess(challenge.court_access);
    if (challenge.bike_access) setBikeAccess(challenge.bike_access);
  }, [challenge, forcedMode]);

  const effectiveMode = forcedMode ?? mode;
  // Either might end up meeting, so it needs an area just like Together.
  const inPerson = effectiveMode !== 'separate';

  const locations = locationsQ.data ?? [];
  // The prototype's picker is a grouped list, not a search box
  // (docs/prototypes/src/app_b.js:193). Groups come from the table's own
  // location_group so a new area appears here by being inserted, exactly as
  // Battaramulla did, with no list to keep in step.
  const groups = useMemo(() => {
    const order: LocationRow['location_group'][] = ['colombo_city', 'greater_colombo'];
    return order
      .map((key) => ({
        key,
        title: GROUP_TITLES[key],
        // An area already chosen is not on offer. Offering it again only
        // produces a tap that does nothing.
        rows: locations.filter((l) => l.location_group === key && !picked.includes(l.value))
      }))
      .filter((g) => g.rows.length > 0);
  }, [locations, picked]);

  const labelFor = (value: string) =>
    locations.find((l) => l.value === value)?.label ?? value;
  const canAddArea = picked.length < MAX_AREAS;

  const showBadminton = activityKey === 'badminton';
  const showBike = activityKey === 'cycling';

  const canSubmit = Boolean(challenge?.id) && (!inPerson || picked.length > 0);

  const join = async () => {
    if (!challenge?.id) return;
    await joinPool.mutateAsync({
      userChallengeId: challenge.id,
      mode: effectiveMode,
      preferredLocations: inPerson ? picked : [],
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
      <SafeAreaView style={styles.root} edges={['bottom', 'left', 'right']}>
        <LoadingState />
      </SafeAreaView>
    );
  }

  // edges without 'top': the pill positions itself against insets.top, so
  // letting SafeAreaView pad the top as well would count it twice.
  return (
    <SafeAreaView style={styles.root} edges={['bottom', 'left', 'right']}>
      <TopBarPill
        title="Find"
        left={
          <PressableScale
            onPress={() => router.back()}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Ionicons name="chevron-back" size={20} color={theme.colors.onNavy} />
          </PressableScale>
        }
      />

      <KeyboardFooterScroll
        contentContainerStyle={[styles.content, { paddingTop: clearance }]}
        footerStyle={styles.footer}
        footer={
          <Button
            label="Find my partner"
            disabled={!canSubmit}
            loading={joinPool.isPending}
            onPress={onSubmit}
          />
        }
      >
        <AppText variant="label" muted style={styles.eyebrow}>
          Find a partner{template?.title ? `, ${template.title}` : ''}
        </AppText>
        <AppText variant="title">
          A few quick{' '}
          <AppText variant="title" style={styles.emphasis}>
            questions
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
              icon="together"
              title="In person"
              detail="Meet up and do it side by side."
              active={mode === 'together'}
              onPress={() => setMode('together')}
            />
            {/* "Separately, together" in full. The app shortened it to
                "Separately", which drops the half that is the point: the
                commitment is shared even when the session is not. */}
            <Choice
              icon="separate"
              title="Separately, together"
              detail="Same commitment, your own place, your own time."
              active={mode === 'separate'}
              onPress={() => setMode('separate')}
            />
            <Choice
              icon="community"
              title="Either works"
              detail="Show me both. You'll decide together."
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
            {/* The picker is a grouped LIST, not a search box (#166).

                The app had a typeahead, built faithfully from
                docs/prototypes/choner-find-flow.html, which was superseded a
                day later by docs/prototypes/src/app_b.js:193. Typing only
                works when you already know the name: someone unsure whether
                we cover Kaduwela gets "No area matches" and no way to find
                out what we do have. On the one field that decides whether a
                match is possible at all, that is the difference between
                choosing an area and giving up.

                Up to TWO areas (#140), each a gradient chip you can close. */}
            <AppText style={styles.fieldLabel}>Your locations</AppText>
            {picked.length ? (
              <View style={styles.pillRow}>
                {picked.map((value) => (
                  <LinearGradient
                    key={value}
                    colors={theme.gradients.warm as unknown as readonly [string, string]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.areaChip}
                  >
                    <AppText style={styles.areaChipLabel}>{labelFor(value)}</AppText>
                    <PressableScale
                      onPress={() => setPicked((prev) => prev.filter((v) => v !== value))}
                      haptic="selection"
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${labelFor(value)}`}
                      style={styles.areaChipX}
                    >
                      <Icon name="x" size={12} color="#FFFFFF" strokeWidth={2.4} />
                    </PressableScale>
                  </LinearGradient>
                ))}
              </View>
            ) : null}
            {canAddArea ? (
              <PressableScale
                onPress={() => setPickerOpen(true)}
                haptic="selection"
                accessibilityRole="button"
                accessibilityLabel={picked.length ? 'Add one more area' : 'Choose an area'}
                style={styles.selectTrigger}
              >
                <AppText style={styles.selectTriggerLabel}>
                  {picked.length ? 'Add one more' : 'Choose an area'}
                </AppText>
                <Ionicons name="chevron-down" size={18} color={theme.colors.muted} />
              </PressableScale>
            ) : null}
            <AppText variant="caption" muted style={styles.hint}>
              {canAddArea
                ? 'Pick up to two from the list. We only use these to find someone close enough to meet.'
                : 'Two is the maximum. Remove one to change it.'}
            </AppText>
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
      </KeyboardFooterScroll>

      {/* The list itself. A sheet rather than an inline dropdown: 69 areas do
          not fit under a field, and a native <select> has no counterpart here.
          Scrim and card follow ConfirmProvider so every overlay in the app
          behaves the same way. */}
      <Modal
        visible={pickerOpen}
        transparent
        animationType="none"
        onRequestClose={() => setPickerOpen(false)}
      >
        <Animated.View entering={FadeIn.duration(160)} style={styles.scrim}>
          {/* Tapping the dimmed area closes, which is what every sheet in the
              app does and what people try first. */}
          <PressableScale
            onPress={() => setPickerOpen(false)}
            scaleTo="subtle"
            accessibilityRole="button"
            accessibilityLabel="Close"
            style={styles.scrimFill}
          />
          <Animated.View entering={FadeInDown.delay(40).duration(200)} style={styles.sheet}>
            <AppText variant="subtitle">
              {picked.length ? 'Add one more' : 'Choose an area'}
            </AppText>
            <ScrollView style={styles.sheetScroll} contentContainerStyle={styles.sheetBody}>
              {groups.map((group) => (
                <View key={group.key}>
                  <AppText variant="label" muted style={styles.groupTitle}>
                    {group.title}
                  </AppText>
                  {group.rows.map((l, i) => (
                    <PressableScale
                      key={l.value}
                      onPress={() => {
                        setPicked((prev) =>
                          prev.includes(l.value) ? prev : [...prev, l.value].slice(0, MAX_AREAS)
                        );
                        setPickerOpen(false);
                      }}
                      haptic="selection"
                      accessibilityRole="button"
                      style={[styles.areaRow, i > 0 && styles.areaRowDivider]}
                    >
                      <AppText style={styles.areaRowLabel}>{l.label}</AppText>
                    </PressableScale>
                  ))}
                </View>
              ))}
            </ScrollView>
            <Button label="Cancel" variant="ghost" onPress={() => setPickerOpen(false)} />
          </Animated.View>
        </Animated.View>
      </Modal>

    </SafeAreaView>
  );
}

function Choice({
  icon,
  title,
  detail,
  active,
  onPress
}: {
  icon: string;
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
      {/* 34pt tile, 22pt glyph, muted until chosen — the prototype's
          .choice .ic rule (choner-app-flow.html:149-151). */}
      <View style={styles.choiceIcon}>
        <Icon
          name={icon}
          size={22}
          color={active ? theme.colors.primary2 : theme.colors.muted}
        />
      </View>
      <View style={styles.choiceText}>
        <AppText style={styles.choiceTitle}>{title}</AppText>
        <AppText variant="caption" muted>
          {detail}
        </AppText>
      </View>
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
  // No local top bar any more: TopBarPill draws it, floating, from the one
  // place the geometry lives (#121). paddingTop comes from useTopBarClearance.
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: theme.colors.surface,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    padding: theme.spacing(2),
    ...theme.shadow.sm
  },
  choiceIcon: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  // The text column takes the remaining width so a two-line detail wraps
  // inside the card rather than pushing the icon off it.
  choiceText: { flex: 1, gap: 2 },
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
    borderColor: 'transparent'
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
  selectTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    paddingVertical: 14,
    paddingHorizontal: 16
  },
  selectTriggerLabel: { fontSize: 14, color: theme.colors.muted },
  hint: { marginTop: 8, lineHeight: 17 },
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.overlayDim,
    justifyContent: 'flex-end'
  },
  scrimFill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  sheet: {
    backgroundColor: theme.colors.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    gap: theme.spacing(1),
    maxHeight: '80%'
  },
  sheetScroll: { flexGrow: 0 },
  sheetBody: { paddingBottom: theme.spacing(1) },
  groupTitle: {
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: theme.spacing(1.5),
    marginBottom: 4
  },
  areaRow: { paddingVertical: 13 },
  areaRowDivider: { borderTopWidth: 1, borderTopColor: theme.colors.border },
  areaRowLabel: { fontSize: 14, color: theme.colors.text },
  pillLabel: { fontSize: 13, color: theme.colors.text, fontFamily: theme.fonts.bodyMedium },
  pillLabelActive: { color: '#FFFFFF' },
  footer: { padding: 20, paddingTop: theme.spacing(1) }
});
