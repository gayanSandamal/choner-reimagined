import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/Chip';
import { Input } from '@/components/ui/input';
import { PressableScale } from '@/components/ui/PressableScale';
import { Negotiation } from '@/components/plans/Negotiation';
import { searchPlaces } from '@/features/plans/api';
import { COPY, DISTANCES, lines } from '@/features/plans/copy';
import { formatDayTime } from '@/features/plans/format';
import {
  useConfirmPlan,
  useProposePlanValue,
  useSetDistanceAnswer
} from '@/features/plans/hooks';
import { at, middleDistance, nextDays, TIME_SLOTS } from '@/features/plans/negotiation';
import type { PairPlan } from '@/features/plans/types';
import { notify } from '@/lib/alert';
import { theme } from '@/constants/theme';

async function guard(fn: () => Promise<any>) {
  try {
    const res = await fn();
    if (res && res.ok === false) notify('Could not do that', 'Please try again.');
  } catch (error: any) {
    notify('Could not do that', error.message);
  }
}

// "How far would you like to run?" — the handover's wording for running; the
// same question for a walk or a ride.
function howFarHeading(activity: string | null) {
  if (activity === 'walking') return 'How far would you like to walk?';
  if (activity === 'cycling') return 'How far would you like to ride?';
  return COPY.howFar;
}

// C4 — How much. Distance only. Your own answer is yours alone: the other
// person's is shown read-only and can never be edited from here (§3.4's bug).
export function HowMuchStep({ plan }: { plan: PairPlan }) {
  const setAnswer = useSetDistanceAnswer();
  const propose = useProposePlanValue();
  const mine = plan.me.distance_answer;
  const theirs = plan.them.distance_answer;

  if (!mine) {
    return (
      <View style={styles.wrap}>
        <AppText variant="title">{howFarHeading(plan.activity_key)}</AppText>
        <View style={styles.options}>
          {DISTANCES.map((d) => (
            <Option key={d} label={d} onPress={() => guard(() => setAnswer.mutateAsync({ planId: plan.id, value: d }))} />
          ))}
        </View>
      </View>
    );
  }

  if (!theirs) {
    return (
      <View style={styles.wrap}>
        <AppText variant="title">{howFarHeading(plan.activity_key)}</AppText>
        <Compare mine={mine} theirs={null} them={plan.them.first_name} />
        <AppText muted>{lines.waitingFor(plan.them.first_name)}</AppText>
      </View>
    );
  }

  // Different answers: the shared negotiation, seeded with yours, theirs, or
  // the middle of the two.
  const middle = middleDistance(mine, theirs);
  const suggest = (value: string, done: () => void) =>
    guard(async () => {
      const r = await propose.mutateAsync({ planId: plan.id, field: 'distance', value });
      done();
      return r;
    });
  return (
    <View style={styles.wrap}>
      <AppText variant="title">{COPY.distanceConflict}</AppText>
      <Compare mine={mine} theirs={theirs} them={plan.them.first_name} />
      <Negotiation
        plan={plan}
        field="distance"
        renderSuggest={(done) => (
          <View style={styles.options}>
            <Option label={`Yours: ${mine}`} onPress={() => suggest(mine, done)} />
            <Option label={`${plan.them.first_name}'s: ${theirs}`} onPress={() => suggest(theirs, done)} />
            {middle ? <Option label={`Meet in the middle: ${middle}`} onPress={() => suggest(middle, done)} /> : null}
          </View>
        )}
      />
    </View>
  );
}

function Compare({ mine, theirs, them }: { mine: string; theirs: string | null; them: string }) {
  return (
    <View style={styles.compare}>
      <View style={styles.compareCol}>
        <AppText muted style={styles.compareLabel}>You</AppText>
        <AppText style={styles.compareValue}>{mine}</AppText>
      </View>
      <View style={styles.compareCol}>
        <AppText muted style={styles.compareLabel}>{them}</AppText>
        <AppText style={styles.compareValue}>{theirs ?? '—'}</AppText>
      </View>
    </View>
  );
}

// C5 — only reached when both said "Either works" before matching (D3).
export function ModeStep({ plan }: { plan: PairPlan }) {
  const propose = useProposePlanValue();
  const pick = (value: 'together' | 'separate', done: () => void) =>
    guard(async () => {
      const r = await propose.mutateAsync({ planId: plan.id, field: 'mode', value });
      done();
      return r;
    });
  return (
    <View style={styles.wrap}>
      <AppText variant="title">{COPY.modeHeading}</AppText>
      <Negotiation
        plan={plan}
        field="mode"
        renderSuggest={(done) => (
          <View style={styles.options}>
            <Option label={COPY.modeTogether} detail={COPY.modeTogetherSub} onPress={() => pick('together', done)} />
            <Option label={COPY.modeSeparate} detail={COPY.modeSeparateSub} onPress={() => pick('separate', done)} />
          </View>
        )}
      />
    </View>
  );
}

// 6A Where — a place typed in words, with suggestions. No map, no GPS.
export function WhereStep({ plan }: { plan: PairPlan }) {
  const propose = useProposePlanValue();
  return (
    <View style={styles.wrap}>
      <AppText variant="title">Where should you meet?</AppText>
      <Negotiation
        plan={plan}
        field="place"
        helpLabel={COPY.needHelpPlace}
        suggestAnotherLabel={COPY.suggestAnotherPlace}
        renderSuggest={(done) => (
          <PlaceComposer
            onSubmit={(name, text) =>
              guard(async () => {
                const r = await propose.mutateAsync({ planId: plan.id, field: 'place', value: { name, text } });
                done();
                return r;
              })
            }
          />
        )}
      />
    </View>
  );
}

function PlaceComposer({ onSubmit }: { onSubmit: (name: string, text: string) => void }) {
  const [name, setName] = useState('');
  const [detail, setDetail] = useState('');
  const [suggestions, setSuggestions] = useState<{ name: string; detail: string | null }[]>([]);
  // One autocomplete session per composer, so a search is billed once.
  const token = useMemo(() => `${Date.now()}-${Math.random().toString(36).slice(2)}`, []);
  const picked = useRef(false);

  useEffect(() => {
    if (picked.current) {
      picked.current = false;
      return;
    }
    const q = name.trim();
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }
    const t = setTimeout(() => {
      searchPlaces(q, token).then(setSuggestions).catch(() => setSuggestions([]));
    }, 300);
    return () => clearTimeout(t);
  }, [name, token]);

  return (
    <View style={styles.wrap}>
      <Input label="Place" value={name} onChangeText={setName} placeholder="e.g. Diyasaru Park" maxLength={120} />
      {suggestions.map((s) => (
        <PressableScale
          key={`${s.name}-${s.detail}`}
          onPress={() => {
            picked.current = true;
            setName(s.name);
            setSuggestions([]);
          }}
          haptic="selection"
        >
          <AppText style={styles.suggestion}>
            {s.name}
            {s.detail ? <AppText muted> · {s.detail}</AppText> : null}
          </AppText>
        </PressableScale>
      ))}
      <Input
        label="Where exactly? (optional)"
        value={detail}
        onChangeText={setDetail}
        placeholder="e.g. by the main gate"
        maxLength={160}
      />
      <Button label="Suggest this place" disabled={name.trim().length < 2} onPress={() => onSubmit(name.trim(), detail.trim())} />
    </View>
  );
}

function DayTimePicker({
  onPick,
  cta,
  differentTimes
}: {
  onPick: (value: { starts_at: string; other_at?: string }) => void;
  cta: string;
  differentTimes?: boolean;
}) {
  const days = useMemo(() => nextDays(), []);
  const [day, setDay] = useState<Date | null>(null);
  const [same, setSame] = useState(true);
  const [mine, setMine] = useState<(typeof TIME_SLOTS)[number] | null>(null);
  const [theirs, setTheirs] = useState<(typeof TIME_SLOTS)[number] | null>(null);
  const ready = day && mine && (!differentTimes || same || theirs);

  const slotRow = (value: typeof mine, set: (s: (typeof TIME_SLOTS)[number]) => void) => (
    <View style={styles.chips}>
      {TIME_SLOTS.map((s) => {
        const label = new Date(2000, 0, 1, s.h, s.m).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
        return <Chip key={label} label={label} size="sm" active={value === s} onPress={() => set(s)} />;
      })}
    </View>
  );

  return (
    <View style={styles.wrap}>
      <View style={styles.chips}>
        {days.map((d) => (
          <Chip
            key={d.toISOString()}
            label={d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })}
            active={day?.getTime() === d.getTime()}
            onPress={() => setDay(d)}
          />
        ))}
      </View>
      {differentTimes ? (
        <View style={styles.chips}>
          <Chip label={COPY.sameTime} active={same} onPress={() => setSame(true)} />
          <Chip label={COPY.differentTimes} active={!same} onPress={() => setSame(false)} />
        </View>
      ) : null}
      {differentTimes && !same ? <AppText muted style={styles.compareLabel}>Your time</AppText> : null}
      {slotRow(mine, setMine)}
      {differentTimes && !same ? (
        <>
          <AppText muted style={styles.compareLabel}>Their time</AppText>
          {slotRow(theirs, setTheirs)}
        </>
      ) : null}
      <Button
        label={cta}
        disabled={!ready}
        onPress={() =>
          day &&
          mine &&
          onPick({
            starts_at: at(day, mine),
            ...(differentTimes && !same && theirs ? { other_at: at(day, theirs) } : {})
          })
        }
      />
    </View>
  );
}

// 6A When — day + time, same suggest/accept mechanic. No availability
// overlap calculator, by design.
export function WhenStep({ plan }: { plan: PairPlan }) {
  const propose = useProposePlanValue();
  return (
    <View style={styles.wrap}>
      <AppText variant="title">{COPY.whenHeading}</AppText>
      <Negotiation
        plan={plan}
        field="time"
        renderSuggest={(done) => (
          <DayTimePicker
            cta="Suggest this time"
            onPick={(value) =>
              guard(async () => {
                const r = await propose.mutateAsync({ planId: plan.id, field: 'time', value });
                done();
                return r;
              })
            }
          />
        )}
      />
    </View>
  );
}

// 6B Day and time — a shared time, or a time each.
export function DayTimeStep({ plan }: { plan: PairPlan }) {
  const propose = useProposePlanValue();
  return (
    <View style={styles.wrap}>
      <AppText variant="title">{COPY.whenHeading}</AppText>
      <Negotiation
        plan={plan}
        field="day_time"
        renderSuggest={(done) => (
          <DayTimePicker
            differentTimes
            cta="Suggest this"
            onPick={(value) =>
              guard(async () => {
                const r = await propose.mutateAsync({ planId: plan.id, field: 'day_time', value });
                done();
                return r;
              })
            }
          />
        )}
      />
    </View>
  );
}

// 6A / 6B Confirm — the whole plan in one summary. No phone numbers anywhere,
// and no "Jump to the day": the day arrives on its own.
export function ConfirmStep({ plan }: { plan: PairPlan }) {
  const confirm = useConfirmPlan();
  const together = plan.mode === 'together';
  const when = plan.starts_at ? formatDayTime(plan.starts_at) : null;
  const myTime = plan.me.planned_at ? formatDayTime(plan.me.planned_at).time : when?.time;
  const theirTime = plan.them.planned_at ? formatDayTime(plan.them.planned_at).time : when?.time;
  const timing = together || myTime === theirTime ? `${when?.day}, ${when?.time}` : `Same day, different times (${when?.day})`;

  return (
    <View style={styles.wrap}>
      <AppText variant="title">Your {plan.kind === 'first_run' ? 'first run' : 'meetup'}</AppText>
      <View style={styles.card}>
        <Row label="Distance" value={plan.distance ?? '—'} />
        <Row label="When" value={timing} />
        {together ? <Row label="Where" value={[plan.place_name, plan.place_text].filter(Boolean).join(' — ')} /> : null}
      </View>
      {together ? (
        <>
          <AppText muted>{COPY.chatOpensLine}</AppText>
          <AppText muted style={styles.safety}>{COPY.safety}</AppText>
        </>
      ) : null}
      {plan.me.confirmed_at ? (
        <AppText muted>{lines.waitingFor(plan.them.first_name)}</AppText>
      ) : (
        <Button
          label={together ? COPY.imIn : COPY.commitTogether}
          loading={confirm.isPending}
          onPress={() => guard(() => confirm.mutateAsync(plan.id))}
        />
      )}
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <AppText muted style={styles.compareLabel}>{label}</AppText>
      <AppText style={styles.rowValue}>{value}</AppText>
    </View>
  );
}

function Option({ label, detail, onPress }: { label: string; detail?: string; onPress: () => void }) {
  return (
    <PressableScale onPress={onPress} haptic="selection" style={styles.option} accessibilityRole="button" accessibilityLabel={label}>
      <AppText style={styles.optionLabel}>{label}</AppText>
      {detail ? <AppText muted style={styles.optionDetail}>{detail}</AppText> : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: theme.spacing(1.5) },
  options: { gap: theme.spacing(1) },
  option: {
    backgroundColor: theme.colors.surface3,
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing(1.5),
    paddingHorizontal: theme.spacing(1.5),
    gap: 2
  },
  optionLabel: { color: theme.colors.text, fontSize: 14 },
  optionDetail: { fontSize: 12 },
  compare: { flexDirection: 'row', gap: theme.spacing(1.5) },
  compareCol: { flex: 1, backgroundColor: theme.colors.surface3, borderRadius: theme.radius.md, padding: theme.spacing(1.5) },
  compareLabel: { fontSize: 11.5 },
  compareValue: { fontSize: 16, color: theme.colors.text, fontFamily: theme.fonts.bodyMedium },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  suggestion: { fontSize: 13, color: theme.colors.text, paddingVertical: 6 },
  card: { backgroundColor: theme.colors.surface3, borderRadius: theme.radius.md, padding: theme.spacing(1.75), gap: 10 },
  row: { gap: 2 },
  rowValue: { fontSize: 15, color: theme.colors.text },
  safety: { fontSize: 11.5, lineHeight: 17 }
});
