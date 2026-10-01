import { readFileSync } from 'fs';
import { join } from 'path';
import {
  MATCH_ENDED_TITLE,
  PRE_MEETING_CATEGORIES,
  REPORT_CATEGORIES,
  blockConfirmCopy,
  matchEndedLine,
  reportCategoriesFor
} from './rules';

// The migration is the enforcement; this file is what the app shows. They are
// written in two languages, so these tests are what keeps them saying the
// same thing.
const migration = readFileSync(
  join(__dirname, '../../supabase/migrations/202609231000_report_and_block.sql'),
  'utf8'
);

describe('report categories', () => {
  it('offers only the two pre-meeting categories before the pair has met', () => {
    expect(reportCategoriesFor(false).map((c) => c.value)).toEqual([
      'fake_profile',
      'something_else'
    ]);
  });

  it('offers all six, in the spec order, once they have met', () => {
    expect(reportCategoriesFor(true).map((c) => c.label)).toEqual([
      "Didn't show up",
      'Made me uncomfortable',
      'Inappropriate behavior or messages',
      'Safety concern at a meetup',
      'Fake profile',
      'Something else'
    ]);
  });

  it('matches the categories the database accepts', () => {
    const check = migration.match(/category text not null check \(category in \(([\s\S]*?)\)\)/);
    expect(check).not.toBeNull();
    const sqlValues = [...check![1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
    expect(sqlValues).toEqual(REPORT_CATEGORIES.map((c) => c.value));
  });

  it('matches the pre-meeting rule the database enforces', () => {
    const rules = [...migration.matchAll(/p_category not in \(([^)]*)\)/g)];
    // report_partner and report_match both enforce it.
    expect(rules).toHaveLength(2);
    for (const rule of rules) {
      const values = [...rule[1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
      expect(values).toEqual([...PRE_MEETING_CATEGORIES]);
    }
  });
});

describe('ended copy', () => {
  it('never tells the other person they were blocked or reported', () => {
    const shown = `${MATCH_ENDED_TITLE} ${matchEndedLine('other')}`.toLowerCase();
    for (const word of ['block', 'report', 'review', 'team']) {
      expect(shown).not.toContain(word);
    }
  });

  it('is the exact notification the other person receives', () => {
    // notify_match_ended() writes the in-app row; the screen and the row must
    // read identically, or the notification becomes the tell.
    expect(migration).toContain(`'${MATCH_ENDED_TITLE}'`);
    expect(migration).toContain(`'${matchEndedLine('other')}'`);
  });

  it('confirms a block without softening what the other person will see', () => {
    expect(blockConfirmCopy('Gayan')).toEqual({
      title: 'Block Gayan?',
      message:
        "This ends your match right away. Gayan won't be told you blocked them. They'll just see the match has ended."
    });
  });
});

describe('ending a match, the neutral way', () => {
  const endMigration = readFileSync(
    join(__dirname, '../../supabase/migrations/202610030900_partner_outlives_the_challenge.sql'),
    'utf8'
  );

  it('offers exactly the six reasons the server accepts', () => {
    const { END_MATCH_REASONS } = require('./rules');
    expect(END_MATCH_REASONS).toHaveLength(6);
    for (const r of END_MATCH_REASONS) expect(endMigration).toContain(`'${r.value}'`);
  });

  it('keeps the reasons separate from the report categories', () => {
    const { END_MATCH_REASONS } = require('./rules');
    const reportValues = REPORT_CATEGORIES.map((c) => c.value as string);
    for (const r of END_MATCH_REASONS) expect(reportValues).not.toContain(r.value);
  });

  it('always lets someone leave without saying why', () => {
    const { END_MATCH_REASONS } = require('./rules');
    expect(END_MATCH_REASONS.map((r: { value: string }) => r.value)).toContain('prefer_not_to_say');
  });

  it('opens the report flow for one reason only, and only after ending', () => {
    const { END_MATCH_REASONS, offersReportAfter } = require('./rules');
    const doors = END_MATCH_REASONS.filter((r: { value: any }) => offersReportAfter(r.value));
    expect(doors.map((r: { value: string }) => r.value)).toEqual(['something_felt_off']);
  });

  it('never tells the other person why', () => {
    const { endMatchConfirmCopy } = require('./rules');
    expect(endMatchConfirmCopy('Gayan').message).toMatch(/not why/);
    expect(matchEndedLine('other')).not.toMatch(/reason|because/i);
  });

  it('says how long a pair has been paired', () => {
    const { pairedFor } = require('./rules');
    const now = new Date('2026-10-03T12:00:00Z');
    expect(pairedFor('2026-10-03T08:00:00Z', now)).toBe('since today');
    expect(pairedFor('2026-10-02T08:00:00Z', now)).toBe('for 1 day');
    expect(pairedFor('2026-09-28T08:00:00Z', now)).toBe('for 5 days');
    expect(pairedFor('2026-09-12T08:00:00Z', now)).toBe('for 3 weeks');
    expect(pairedFor(null, now)).toBeNull();
  });
});
