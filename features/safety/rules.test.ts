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
        "This ends your match right away. Gayan won't be told you blocked them — they'll just see the match has ended."
    });
  });
});
