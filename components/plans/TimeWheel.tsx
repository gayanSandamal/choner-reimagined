import { ElementRef, useEffect, useRef, useState } from "react";
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { AppText } from "@/components/ui/AppText";
import {
  DAY_END,
  DAY_START,
  dayLabel,
  daytimeRangeLine,
  fromWheel,
  hourInDaytime,
  TimeOfDay,
  toWheel,
  WHEEL_HOURS,
  WHEEL_MINUTES,
  WHEEL_PERIODS,
} from "@/features/plans/negotiation";
import { haptics } from "@/lib/haptics";
import { theme } from "@/constants/theme";

// The time wheel (#191): three columns you scroll, hour, minutes, AM or PM.
// It replaces a wall of 33 half-hour buttons.
//
// On Android every column is ours. On iPhone (decided 10 Nov 2026) the hour,
// minutes and AM/PM are Apple's own wheel, and the day column stays ours,
// restyled in Apple's grey so the row reads as one control. The day stays ours
// because Apple's date wheel writes in the phone's calendar: on a phone set to
// the Persian calendar it shows "19 Aban". Apple's time-only wheel shows no
// date at all, so it cannot.
//
// It always holds a time, so there is no "nothing picked yet" state to guard.
//
// Given `days`, it carries the day as well: one wheel for day and time, in a
// row, like the phone's own alarm picker (decided 10 Nov 2026).

const ROW = 40;
// Apple's wheel: 216 points tall, rows about 32 apart, a grey band in the
// middle. The day column copies these so the two halves line up.
const APPLE_H = 216;
const APPLE_ROW = 32;
// Apple's time wheel needs about this much width for hour, minutes and AM/PM.
// Squeezed narrower, iOS replaces the minutes with "..." (#204), so the day
// column is kept narrow and the wheel is given the rest, measured.
const APPLE_DAY_W = 108;
const APPLE_TIME_MIN_W = 236;

function Column<T extends string | number>({
  items,
  index,
  onIndex,
  rows,
  width,
  format,
  label,
  faint,
  small,
  rowHeight = ROW,
  height,
  apple,
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
  rowHeight?: number;
  // The column's height, when it has to match something else (Apple's wheel).
  height?: number;
  // Drawn in Apple's style: system font, black and grey, no orange.
  apple?: boolean;
}) {
  const ROW = rowHeight;
  const tall = height ?? ROW * rows;
  const ref = useRef<ElementRef<typeof ScrollView>>(null);
  // The index this column last reported itself. A change of `index` that does
  // not match it came from outside (a tap, a reset), and only those scroll the
  // column: scrolling to follow our own report would fight the finger.
  const reported = useRef(index);
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pad = (tall - ROW) / 2;

  const scrollTo = (i: number, animated: boolean) =>
    ref.current?.scrollTo({ y: i * ROW, animated });

  useEffect(() => {
    if (index !== reported.current) {
      reported.current = index;
      scrollTo(index, true);
    }
  }, [index]);

  useEffect(
    () => () => {
      if (settle.current) clearTimeout(settle.current);
    },
    [],
  );

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const i = Math.min(items.length - 1, Math.max(0, Math.round(y / ROW)));
    if (i !== reported.current) {
      reported.current = i;
      haptics.selection();
      onIndex(i);
    }
    // The browser has no snap interval, so finish the scroll by hand there.
    if (Platform.OS === "web") {
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
      style={{ width, height: tall }}
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
      accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
      onAccessibilityAction={(e) =>
        step(e.nativeEvent.actionName === "increment" ? 1 : -1)
      }
    >
      {items.map((item, i) => (
        <Pressable
          key={String(item)}
          onPress={() => onIndex(i)}
          style={[styles.item, { height: ROW }]}
        >
          {apple ? (
            <Text
              numberOfLines={1}
              style={[
                styles.appleText,
                i === index && styles.appleOn,
                Math.abs(i - index) >= 2 && styles.appleFar,
              ]}
            >
              {format(item)}
            </Text>
          ) : (
            <AppText
              numberOfLines={1}
              style={[
                styles.itemText,
                small && styles.itemSmall,
                i === index && styles.itemOn,
                i === index && small && styles.itemOnSmall,
                faint?.(item) && styles.itemFaint,
              ]}
            >
              {format(item)}
            </AppText>
          )}
        </Pressable>
      ))}
    </ScrollView>
  );
}

export function TimeWheel({
  value,
  onChange,
  compact,
  label = "Time",
  days,
  dayIndex = 0,
  onDayIndex,
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
  const [rowW, setRowW] = useState(0);
  const narrow = withDays ? 50 : 64;
  const rows = compact ? 3 : 5;
  const w = toWheel(value);
  const set = (next: Partial<typeof w>) => {
    const n = { ...w, ...next };
    onChange(fromWheel(n.hour, n.minute, n.period));
  };

  if (Platform.OS === "ios") {
    // Apple's wheel takes a whole date; only its time is read. The date is the
    // chosen day (or today), so the daytime bounds below fall on the same day.
    const base = withDays
      ? new Date(days![Math.min(dayIndex, days!.length - 1)])
      : new Date();
    base.setHours(0, 0, 0, 0);
    const on = (t: TimeOfDay) => {
      const d = new Date(base);
      d.setHours(t.h, t.m, 0, 0);
      return d;
    };
    const dayW = withDays ? APPLE_DAY_W : 0;
    const timeW = Math.max(APPLE_TIME_MIN_W, rowW - dayW);
    return (
      <View style={styles.outer}>
        <View
          style={[styles.appleRow, { height: APPLE_H }]}
          accessibilityLabel={label}
          onLayout={(e) => setRowW(e.nativeEvent.layout.width)}
        >
          {withDays ? (
            <>
              <View pointerEvents="none" style={styles.appleBand} />
              <Column
                items={days!.map((_, i) => i)}
                index={Math.min(dayIndex, days!.length - 1)}
                onIndex={onDayIndex!}
                rows={7}
                rowHeight={APPLE_ROW}
                height={APPLE_H}
                width={APPLE_DAY_W}
                format={(i) => dayLabel(days![i])}
                label={`${label}, day`}
                apple
              />
            </>
          ) : null}
          <DateTimePicker
            value={on(value)}
            mode="time"
            display="spinner"
            // Half hours, as the Android wheel (#191).
            minuteInterval={30}
            // Daytime only, 5:00 AM to 9:00 PM: Apple greys out the rest itself.
            minimumDate={on(DAY_START)}
            maximumDate={on(DAY_END)}
            // AM and PM, as everywhere else in the app. A phone set to 24-hour
            // time may still show 19:00 here: to be checked on a device.
            locale="en_US"
            themeVariant="light"
            textColor="#000000"
            onValueChange={(_, d) => {
              if (d)
                onChange({ h: d.getHours(), m: d.getMinutes() < 30 ? 0 : 30 });
            }}
            style={[styles.appleTime, { width: timeW }]}
            accessibilityLabel={`${label}, time`}
          />
        </View>
        <AppText style={styles.range}>{daytimeRangeLine()}</AppText>
      </View>
    );
  }

  return (
    <View style={styles.outer}>
      <View style={styles.wheel} accessibilityLabel={label}>
        <View
          pointerEvents="none"
          style={[styles.band, { top: (ROW * (rows - 1)) / 2 }]}
        />
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
          format={(m) => String(m).padStart(2, "0")}
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
      <AppText style={styles.range}>{daytimeRangeLine()}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wheel: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: theme.colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: "hidden",
  },
  // The row the chosen time sits in.
  band: {
    position: "absolute",
    left: 10,
    right: 10,
    height: ROW,
    borderRadius: 12,
    backgroundColor: "rgba(253,131,2,0.10)",
    borderWidth: 1,
    borderColor: "rgba(253,131,2,0.35)",
  },
  item: { height: ROW, alignItems: "center", justifyContent: "center" },
  itemText: {
    fontSize: 18,
    color: theme.colors.muted,
    fontFamily: theme.fonts.bodyMedium,
  },
  itemOn: {
    fontSize: 21,
    color: theme.colors.text,
    fontFamily: theme.fonts.bodyBold,
  },
  itemFaint: { color: theme.colors.dim },
  // iPhone: Apple's look for our day column.
  appleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  appleBand: {
    position: "absolute",
    left: 8,
    right: 8,
    top: (APPLE_H - APPLE_ROW) / 2,
    height: APPLE_ROW,
    borderRadius: 8,
    backgroundColor: "rgba(118,118,128,0.12)",
  },
  appleText: { fontSize: 16, color: "rgba(60,60,67,0.6)" },
  appleOn: { fontSize: 17, color: "#000000" },
  appleFar: { color: "rgba(60,60,67,0.3)", fontSize: 15 },
  appleTime: { height: APPLE_H },
  outer: { gap: 8 },
  range: { textAlign: "center", fontSize: 12, color: theme.colors.muted },
  itemSmall: { fontSize: 15 },
  itemOnSmall: { fontSize: 16 },
  colon: {
    fontSize: 20,
    color: theme.colors.text,
    fontFamily: theme.fonts.bodyBold,
  },
});
