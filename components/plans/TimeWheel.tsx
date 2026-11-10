import { ElementRef, useEffect, useRef } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View
} from 'react-native';
import { AppText } from '@/components/ui/AppText';
import {
  dayLabel,
  fromWheel,
  hourInDaytime,
  TimeOfDay,
  toWheel,
  WHEEL_HOURS,
  WHEEL_MINUTES,
  WHEEL_PERIODS
} from '@/features/plans/negotiation';
import { haptics } from '@/lib/haptics';
import { theme } from '@/constants/theme';

// The time wheel (#191): three columns you scroll, hour, minutes, AM or PM.
// It replaces a wall of 33 half-hour buttons.
//
// Drawn by the app rather than borrowed from the phone, on purpose. The
// phone's own picker is a wheel on iPhone only (Android's is a clock face),
// and adding it means a new store build. This one looks the same on both and
// ships over the air.
//
// It always holds a time, so there is no "nothing picked yet" state to guard.
//
// Given `days`, it carries the day as well: one wheel for day and time, in a
// row, like the phone's own alarm picker (decided 10 Nov 2026).

const ROW = 40;

function Column<T extends string | number>({
  items,
  index,
  onIndex,
  rows,
  width,
  format,
  label,
  faint,
  small
}: {
  items: readonly T[];
  index: number;
  onIndex: (i: number) => void;
  rows: number;
  width: number;
  format: (item: T) => string;
  label: string;
  // Drawn faint: an hour with no time inside the daytime range. Still
  // reachable, so the wheel never fights the finger; the picker explains.
  faint?: (item: T) => boolean;
  // Smaller text, for the day column's longer words.
  small?: boolean;
}) {
  const ref = useRef<ElementRef<typeof ScrollView>>(null);
  // The index this column last reported itself. A change of `index` that does
  // not match it came from outside (a tap, a reset), and only those scroll the
  // column: scrolling to follow our own report would fight the finger.
  const reported = useRef(index);
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pad = (ROW * (rows - 1)) / 2;

  const scrollTo = (i: number, animated: boolean) => ref.current?.scrollTo({ y: i * ROW, animated });

  useEffect(() => {
    if (index !== reported.current) {
      reported.current = index;
      scrollTo(index, true);
    }
  }, [index]);

  useEffect(() => () => {
    if (settle.current) clearTimeout(settle.current);
  }, []);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const i = Math.min(items.length - 1, Math.max(0, Math.round(y / ROW)));
    if (i !== reported.current) {
      reported.current = i;
      haptics.selection();
      onIndex(i);
    }
    // The browser has no snap interval, so finish the scroll by hand there.
    if (Platform.OS === 'web') {
      if (settle.current) clearTimeout(settle.current);
      settle.current = setTimeout(() => scrollTo(reported.current, true), 140);
    }
  };

  const step = (by: number) => {
    const i = Math.min(items.length - 1, Math.max(0, index + by));
    if (i !== index) onIndex(i);
  };

  return (
    <ScrollView
      ref={ref}
      style={{ width, height: ROW * rows }}
      contentContainerStyle={{ paddingVertical: pad }}
      contentOffset={{ x: 0, y: index * ROW }}
      onLayout={() => scrollTo(reported.current, false)}
      showsVerticalScrollIndicator={false}
      snapToInterval={ROW}
      decelerationRate="fast"
      nestedScrollEnabled
      scrollEventThrottle={16}
      onScroll={onScroll}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ text: format(items[index]) }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => step(e.nativeEvent.actionName === 'increment' ? 1 : -1)}
    >
      {items.map((item, i) => (
        <Pressable key={String(item)} onPress={() => onIndex(i)} style={styles.item}>
          <AppText
            numberOfLines={1}
            style={[
              styles.itemText,
              small && styles.itemSmall,
              i === index && styles.itemOn,
              i === index && small && styles.itemOnSmall,
              faint?.(item) && styles.itemFaint
            ]}
          >
            {format(item)}
          </AppText>
        </Pressable>
      ))}
    </ScrollView>
  );
}

export function TimeWheel({
  value,
  onChange,
  compact,
  label = 'Time',
  days,
  dayIndex = 0,
  onDayIndex
}: {
  value: TimeOfDay;
  onChange: (t: TimeOfDay) => void;
  // Three rows instead of five.
  compact?: boolean;
  label?: string;
  // The days to offer, first column. Leave out for a time-only wheel.
  days?: Date[];
  dayIndex?: number;
  onDayIndex?: (i: number) => void;
}) {
  const withDays = Boolean(days?.length && onDayIndex);
  const narrow = withDays ? 50 : 64;
  const rows = compact ? 3 : 5;
  const w = toWheel(value);
  const set = (next: Partial<typeof w>) => {
    const n = { ...w, ...next };
    onChange(fromWheel(n.hour, n.minute, n.period));
  };

  return (
    <View style={styles.wheel} accessibilityLabel={label}>
      <View pointerEvents="none" style={[styles.band, { top: (ROW * (rows - 1)) / 2 }]} />
      {withDays ? (
        <Column
          items={days!.map((_, i) => i)}
          index={Math.min(dayIndex, days!.length - 1)}
          onIndex={onDayIndex!}
          rows={rows}
          width={118}
          format={(i) => dayLabel(days![i])}
          label={`${label}, day`}
          small
        />
      ) : null}
      <Column
        items={WHEEL_HOURS}
        index={WHEEL_HOURS.indexOf(w.hour)}
        onIndex={(i) => set({ hour: WHEEL_HOURS[i] })}
        rows={rows}
        width={narrow}
        format={String}
        label={`${label}, hour`}
        faint={(hour) => !hourInDaytime(hour, w.period)}
      />
      <AppText style={styles.colon}>:</AppText>
      <Column
        items={WHEEL_MINUTES}
        index={Math.max(0, WHEEL_MINUTES.indexOf(w.minute))}
        onIndex={(i) => set({ minute: WHEEL_MINUTES[i] })}
        rows={rows}
        width={narrow}
        format={(m) => String(m).padStart(2, '0')}
        label={`${label}, minutes`}
      />
      <Column
        items={WHEEL_PERIODS}
        index={WHEEL_PERIODS.indexOf(w.period)}
        onIndex={(i) => set({ period: WHEEL_PERIODS[i] })}
        rows={rows}
        width={withDays ? 56 : 72}
        format={String}
        label={`${label}, AM or PM`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wheel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: theme.colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden'
  },
  // The row the chosen time sits in.
  band: {
    position: 'absolute',
    left: 10,
    right: 10,
    height: ROW,
    borderRadius: 12,
    backgroundColor: 'rgba(253,131,2,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(253,131,2,0.35)'
  },
  item: { height: ROW, alignItems: 'center', justifyContent: 'center' },
  itemText: { fontSize: 18, color: theme.colors.muted, fontFamily: theme.fonts.bodyMedium },
  itemOn: { fontSize: 21, color: theme.colors.text, fontFamily: theme.fonts.bodyBold },
  itemFaint: { color: theme.colors.dim },
  itemSmall: { fontSize: 15 },
  itemOnSmall: { fontSize: 16 },
  colon: { fontSize: 20, color: theme.colors.text, fontFamily: theme.fonts.bodyBold }
});
