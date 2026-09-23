import { middleDistance, nextDays, TIME_SLOTS } from './negotiation';

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
  it('offers a week of days and 5:00-21:00 in half hours', () => {
    expect(nextDays(new Date('2026-09-23T10:00:00'))).toHaveLength(7);
    expect(TIME_SLOTS[0]).toEqual({ h: 5, m: 0 });
    expect(TIME_SLOTS[TIME_SLOTS.length - 1]).toEqual({ h: 21, m: 0 });
  });
});
