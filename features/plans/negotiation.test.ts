import {
  at,
  dayLabel,
  daytimeHint,
  firstOpenDay,
  fromWheel,
  hourInDaytime,
  inDaytime,
  isPast,
  middleDistance,
  nextDays,
  proposalLabel,
  timeLabel,
  toWheel,
  WHEEL_MINUTES
} from './negotiation';

describe('middleDistance', () => {
  it('meets in the middle of the handover scale', () => {
    expect(middleDistance('1 to 2 km', '5 km')).toBe('3 km');
    expect(middleDistance('3 km', '10 km or more')).toBe('5 to 10 km');
  });
  it('has no middle for equal answers or "Not sure yet"', () => {
    expect(middleDistance('5 km', '5 km')).toBeNull();
    expect(middleDistance('5 km', 'Not sure yet')).toBeNull();
  });
});

describe('pickers', () => {
  it('offers a week of days, and half hours on the wheel', () => {
    expect(nextDays(new Date('2026-09-23T10:00:00'))).toHaveLength(7);
    expect([...WHEEL_MINUTES]).toEqual([0, 30]);
  });

  it('turns the wheel into a 24-hour time and back', () => {
    expect(fromWheel(6, 30, 'AM')).toEqual({ h: 6, m: 30 });
    expect(fromWheel(6, 30, 'PM')).toEqual({ h: 18, m: 30 });
    // The two that catch everyone: 12 AM is midnight, 12 PM is noon.
    expect(fromWheel(12, 0, 'AM')).toEqual({ h: 0, m: 0 });
    expect(fromWheel(12, 0, 'PM')).toEqual({ h: 12, m: 0 });
    for (let h = 0; h < 24; h++) {
      for (const m of WHEEL_MINUTES) {
        const w = toWheel({ h, m });
        expect(fromWheel(w.hour, w.minute, w.period)).toEqual({ h, m });
      }
    }
  });

  it('reads a time back on the 12-hour clock', () => {
    expect(timeLabel({ h: 6, m: 30 })).toBe('6:30 AM');
    expect(timeLabel({ h: 0, m: 0 })).toBe('12:00 AM');
    expect(timeLabel({ h: 12, m: 0 })).toBe('12:00 PM');
    expect(timeLabel({ h: 21, m: 30 })).toBe('9:30 PM');
  });

  it('keeps plans to daytime, 5:00 AM to 9:00 PM, both ends included', () => {
    expect(inDaytime({ h: 5, m: 0 })).toBe(true);
    expect(inDaytime({ h: 21, m: 0 })).toBe(true);
    expect(inDaytime({ h: 6, m: 30 })).toBe(true);
    expect(inDaytime({ h: 4, m: 30 })).toBe(false);
    expect(inDaytime({ h: 21, m: 30 })).toBe(false);
    expect(inDaytime({ h: 0, m: 0 })).toBe(false);
    expect(inDaytime({ h: 2, m: 0 })).toBe(false);
    expect(daytimeHint()).toBe('Pick a time between 5:00 AM and 9:00 PM.');
  });

  it('knows which hours on the wheel have nothing in range', () => {
    expect(hourInDaytime(12, 'AM')).toBe(false);
    expect(hourInDaytime(4, 'AM')).toBe(false);
    expect(hourInDaytime(5, 'AM')).toBe(true);
    expect(hourInDaytime(12, 'PM')).toBe(true);
    // 9:00 PM is the last time, so 9 stays lit and 10 does not.
    expect(hourInDaytime(9, 'PM')).toBe(true);
    expect(hourInDaytime(10, 'PM')).toBe(false);
  });

  it('writes the day itself, with the month', () => {
    const now = new Date(2026, 10, 10, 9, 0, 0); // Tuesday 10 November 2026
    const days = nextDays(now);
    expect(days.map((d) => dayLabel(d, now))).toEqual([
      'Today',
      'Tomorrow',
      'Thu 12 Nov',
      'Fri 13 Nov',
      'Sat 14 Nov',
      'Sun 15 Nov',
      'Mon 16 Nov'
    ]);
    expect(dayLabel(new Date(2026, 11, 31), now)).toBe('Thu 31 Dec');
  });

  it('opens on today, or on tomorrow once the opening time has gone', () => {
    const morning = new Date(2026, 10, 10, 5, 0, 0);
    const evening = new Date(2026, 10, 10, 19, 0, 0);
    expect(firstOpenDay(nextDays(morning), { h: 6, m: 30 }, morning)).toBe(0);
    expect(firstOpenDay(nextDays(evening), { h: 6, m: 30 }, evening)).toBe(1);
  });

  it('says whose time is whose, whoever is reading', () => {
    const value = { starts_at: new Date(2026, 10, 11, 6, 30).toISOString(), separate_times: true };
    expect(proposalLabel('day_time', value, { mine: true, them: 'Gayan' })).toMatch(/you at 6:30.*Gayan picks their own time/);
    expect(proposalLabel('day_time', value, { mine: false, them: 'Gayan' })).toMatch(/Gayan at 6:30.*You pick your own time/);
    // An older suggestion with both times in it: starts_at is the suggester's.
    const old = { starts_at: new Date(2026, 10, 11, 6, 30).toISOString(), other_at: new Date(2026, 10, 11, 7, 0).toISOString() };
    expect(proposalLabel('day_time', old, { mine: false, them: 'Gayan' })).toMatch(/you at 7:00.*Gayan at 6:30/);
  });

  it('knows a time that has already gone', () => {
    const now = new Date(2026, 10, 10, 15, 0, 0);
    const today = nextDays(now)[0];
    const tomorrow = nextDays(now)[1];
    expect(isPast(today, { h: 6, m: 30 }, now)).toBe(true);
    expect(isPast(today, { h: 18, m: 0 }, now)).toBe(false);
    expect(isPast(tomorrow, { h: 6, m: 30 }, now)).toBe(false);
    expect(new Date(at(today, { h: 18, m: 0 })).getHours()).toBe(18);
  });
});
