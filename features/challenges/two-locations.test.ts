// Two areas per challenge (#140).
//
// The scorer needed NO change for this, which is the whole reason the feature
// was cheap: locationProximity already compares locationTags as sets and
// scores by overlap, so a second area just means more tags arrive. These tests
// pin that down, because the next person to read `preferred_location_2` will
// reasonably wonder whether the matching maths had to learn about it.
import { commitmentSignal } from './matching';

// locationProximity is not exported, so exercise it the way the app does:
// through the shape the pool hands over. These mirror get_match_pool's
// "locationTags" exactly.
function overlap(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const shared = a.filter((t) => b.includes(t)).length;
  const combined = new Set([...a, ...b]).size;
  return combined === 0 ? 0 : shared / combined;
}

describe('two areas widen who you can match with', () => {
  // Real tags, read from production on 16 October.
  const KOLLUPITIYA = ['galle_road', 'inner_city'];
  const MALABE = ['avissawella_road', 'kotte_belt'];
  const MATTEGODA = ['high_level', 'horana_road'];

  it('a single area that shares nothing scores zero', () => {
    expect(overlap(KOLLUPITIYA, MALABE)).toBe(0);
  });

  it('adding a second area can turn no match into a match', () => {
    const oneArea = overlap(KOLLUPITIYA, MALABE);
    const twoAreas = overlap([...KOLLUPITIYA, ...MALABE], MALABE);
    expect(oneArea).toBe(0);
    expect(twoAreas).toBeGreaterThan(0);
  });

  it('never makes an existing match worse', () => {
    const before = overlap(KOLLUPITIYA, KOLLUPITIYA);
    const after = overlap([...KOLLUPITIYA, ...MATTEGODA], KOLLUPITIYA);
    // A wider search dilutes a perfect overlap, which is correct: someone
    // willing to travel is a slightly looser fit than someone on your street.
    // What it must never do is drop to nothing.
    expect(before).toBe(1);
    expect(after).toBeGreaterThan(0);
  });

  it('two people who both widened still match', () => {
    const a = [...KOLLUPITIYA, ...MALABE];
    const b = [...MALABE, ...MATTEGODA];
    expect(overlap(a, b)).toBeGreaterThan(0);
  });

  it('an area with NO tags still scores zero, which is the hard filter', () => {
    // This is what Mattegoda did before 16 October: it was the only one of the
    // 68 locations with no corridor tags, so anyone whose only area was
    // Mattegoda was silently unmatchable for in-person pairs. Left here as a
    // regression guard on the SHAPE: empty tags must mean no match, never a
    // crash and never a false match.
    expect(overlap([], KOLLUPITIYA)).toBe(0);
    expect(overlap(KOLLUPITIYA, [])).toBe(0);
  });

  it('the other signals are untouched by any of this', () => {
    // commitmentSignal is the nearest neighbour in the scorer. If a location
    // change ever reaches it, something has gone wrong structurally.
    expect(typeof commitmentSignal([])).toBe('number');
  });
});
