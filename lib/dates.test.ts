import { clockLabel, dateLabel, monthName, monthYearLabel, weekdayName } from './dates';

// Tuesday 10 November 2026, 7:30 PM, in the machine's own time zone.
const d = new Date(2026, 10, 10, 19, 30);

describe('dates the app writes itself', () => {
  it('names the day and month in English, on the Gregorian calendar', () => {
    expect(weekdayName(d)).toBe('Tuesday');
    expect(weekdayName(d, 'short')).toBe('Tue');
    expect(monthName(d)).toBe('November');
    expect(monthName(d, 'short')).toBe('Nov');
    // What a phone on the Persian calendar wrote: "Tuesday, 19 Aban".
    expect(dateLabel(d)).toBe('Tuesday, 10 November');
    expect(dateLabel(d, 'short')).toBe('Tue, 10 Nov');
    expect(monthYearLabel(d)).toBe('November 2026');
  });

  it('always uses the 12-hour clock', () => {
    expect(clockLabel(d)).toBe('7:30 PM');
    expect(clockLabel(new Date(2026, 10, 10, 0, 5))).toBe('12:05 AM');
    expect(clockLabel(new Date(2026, 10, 10, 12, 0))).toBe('12:00 PM');
    expect(clockLabel(new Date(2026, 10, 10, 6, 30))).toBe('6:30 AM');
  });
});
