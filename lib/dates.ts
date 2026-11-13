// Every date and time the app shows, written by the app itself.
//
// Not by the phone. toLocaleDateString() and toLocaleTimeString() write in the
// phone's own calendar and clock, and on 10 Nov 2026 a tester's iPhone was set
// to the Persian calendar: a session on Tuesday 10 November read "Tuesday, 19
// Aban", and the day picker offered "Mon 18" to "Sun 24", which were 18 to 24
// Aban (9 to 15 November). The same call also wrote 19:30 on one phone and
// 7:30 PM on another.
//
// So: always the Gregorian calendar, English names, the 12-hour clock, in the
// phone's own time zone (that part is right, and new Date() already does it).

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
];

type Width = 'long' | 'short';
const cut = (name: string, width: Width) => (width === 'long' ? name : name.slice(0, 3));

// "Tuesday" or "Tue".
export function weekdayName(d: Date, width: Width = 'long') {
  return cut(DAYS[d.getDay()], width);
}

// "November" or "Nov".
export function monthName(d: Date, width: Width = 'long') {
  return cut(MONTHS[d.getMonth()], width);
}

// "Tuesday, 10 November". Pass short for "Tue, 10 Nov".
export function dateLabel(d: Date, width: Width = 'long') {
  return `${weekdayName(d, width)}, ${d.getDate()} ${monthName(d, width)}`;
}

// "November 2026".
export function monthYearLabel(d: Date) {
  return `${monthName(d)} ${d.getFullYear()}`;
}

// "7:30 PM". Always the 12-hour clock, as the time wheel is (#191).
export function clockLabel(d: Date) {
  const h = d.getHours();
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(d.getMinutes()).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}
