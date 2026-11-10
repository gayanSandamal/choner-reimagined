import { at, fromWheel, isPast, middleDistance, nextDays, timeLabel, toWheel, WHEEL_MINUTES } from './negotiation';

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
