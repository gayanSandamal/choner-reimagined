// The same 19 cases the web form's checker passes, plus the app-specific
// ones. If these two ever disagree, someone has edited one list and not the
// other: web/first-200/index.html carries the twin.
import { suggestEmail } from './email-typo';

describe('suggestEmail', () => {
  it('catches the typo that actually cost us a registration', () => {
    // gmail.con, 15 October 2026. One of eight.
    expect(suggestEmail('umutucumarana@gmail.con')).toBe('umutucumarana@gmail.com');
  });

  it.each([
    ['a@gmai.com', 'a@gmail.com'],
    ['a@gmail.co', 'a@gmail.com'],
    ['a@gmial.com', 'a@gmail.com'],
    ['a@gnail.com', 'a@gmail.com'],
    ['a@gmaill.com', 'a@gmail.com'],
    ['a@yahoo.con', 'a@yahoo.com'],
    ['a@yahooo.com', 'a@yahoo.com'],
    ['a@hotmai.com', 'a@hotmail.com'],
    ['a@outlook.co', 'a@outlook.com'],
    ['a@iclod.com', 'a@icloud.com']
  ])('corrects %s', (input, expected) => {
    expect(suggestEmail(input)).toBe(expected);
  });

  it.each([
    'a@gmail.com',
    // One edit from gmail.com and a real provider. The whole reason the known
    // list exists is so this is never "corrected".
    'a@mail.com',
    'a@sltnet.lk',
    'a@dialog.lk',
    'a@virtusa.com',
    'a@ifs.lk',
    'a@uom.lk',
    'a@99x.io',
    'a@choner.io'
  ])('leaves %s alone', (input) => {
    expect(suggestEmail(input)).toBeNull();
  });

  it.each(['', '   ', 'noatsign', '@nolocal.com', 'trailing@', 'a@nodot'])(
    'says nothing about %p',
    (input) => {
      expect(suggestEmail(input)).toBeNull();
    }
  );

  it('survives null and undefined rather than throwing mid-keystroke', () => {
    expect(suggestEmail(null)).toBeNull();
    expect(suggestEmail(undefined)).toBeNull();
  });

  it('keeps the local part exactly as typed, including case and dots', () => {
    expect(suggestEmail('First.Last+tag@gmial.com')).toBe('First.Last+tag@gmail.com');
  });

  it('ignores case in the domain', () => {
    expect(suggestEmail('a@GMAIL.CON')).toBe('a@gmail.com');
  });

  it('never suggests a change that is not a change', () => {
    for (const domain of ['gmail.com', 'outlook.com', 'proton.me']) {
      expect(suggestEmail(`someone@${domain}`)).toBeNull();
    }
  });
});
