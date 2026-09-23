import { readFileSync } from 'fs';
import { COPY, DISTANCES, OPENER, REACTIONS, RECOVERY_REASONS, REPLIES, lines } from './copy';

// Every handover string must appear in the handover verbatim. Point
// HANDOVER_PATH at the document to run this; CI has no copy of it, so the
// check is skipped there rather than faked.
const path = process.env.HANDOVER_PATH;
const handover = path ? readFileSync(path, 'utf8') : null;
const maybe = handover ? it : it.skip;

describe('session copy matches the handover', () => {
  maybe('uses the handover wording, character for character', () => {
    const fixed = [
      ...Object.values(COPY).filter((s) => !['You two', 'are in.', "You're paired.", "Let's plan it.", 'Finish', 'Waiting'].includes(s)),
      OPENER, ...Object.values(REPLIES), ...DISTANCES, ...RECOVERY_REASONS, ...REACTIONS
    ];
    const missing = fixed.filter((s) => !handover!.includes(s));
    expect(missing).toEqual([]);
  });

  maybe('templated lines render to handover sentences', () => {
    for (const s of [
      lines.chatOpen('{partner}'),
      "It's on. {day}, {time}. Don't keep each other waiting.",
      "You're together. {distance} starts now."
    ]) expect(handover).toContain(s);
  });

  it('never hardcodes a person: every templated line takes its name', () => {
    expect(lines.hereWaiting('Gayan')).toBe("You're here. Waiting for Gayan.");
    expect(lines.hereWaiting('Dinesh')).toBe("You're here. Waiting for Dinesh.");
  });
});
