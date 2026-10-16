/* "Did you mean gmail.com?"
 *
 * A real First 200 registration was lost to `gmail.con` on 15 October, out of
 * eight. It passes every format check there is, ours, zod's and the browser's
 * own type="email", because nothing about it is malformed: the format is
 * perfect and the domain is simply wrong. The only thing that catches it is
 * comparing against domains that actually exist.
 *
 * In the app a typo costs more than an undelivered email. The verification
 * link never arrives, so the account can never be used, AND link_first_200()
 * matches on the verified address, so their place in The First 200 silently
 * fails to attach. They arrive as a stranger.
 *
 * This is the same checker that runs on join.choner.io (web/first-200/
 * index.html). Keep the two lists in step: a domain added there belongs here.
 *
 * It SUGGESTS and never blocks. Someone on a genuinely unusual domain must
 * still be able to sign up, and a false positive that stops a real person is
 * worse than the typo it was trying to catch.
 */

// Real providers are on this list precisely so they are never "corrected".
// mail.com is one edit from gmail.com and must stay mail.com; the Sri Lankan
// providers are here for the same reason.
export const MAIL_DOMAINS = [
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'ymail.com',
  'hotmail.com',
  'outlook.com',
  'live.com',
  'msn.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'aol.com',
  'proton.me',
  'protonmail.com',
  'mail.com',
  'zoho.com',
  'gmx.com',
  'yandex.com',
  'sltnet.lk',
  'slt.lk',
  'sltidc.lk',
  'eureka.lk',
  'dialog.lk',
  'mobitel.lk'
] as const;

// Levenshtein, capped: we only care whether it is within two edits.
export function editDistance(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 2) return 9;
  const prev: number[] = [];
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}

/**
 * The corrected address, or null when there is nothing to say.
 *
 * A domain already on the list is correct by definition and returns null, so
 * mail.com is never "corrected" to gmail.com despite being one edit away.
 */
export function suggestEmail(input: string | null | undefined): string | null {
  const value = String(input ?? '').trim();
  const at = value.lastIndexOf('@');
  if (at < 1) return null;

  const local = value.slice(0, at);
  const domain = value.slice(at + 1).toLowerCase();
  if (!domain || !domain.includes('.')) return null;
  if ((MAIL_DOMAINS as readonly string[]).includes(domain)) return null;

  for (const known of MAIL_DOMAINS) {
    if (editDistance(domain, known) <= 2) return `${local}@${known}`;
  }
  return null;
}
