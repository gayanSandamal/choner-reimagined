import { readFileSync } from 'fs';
import { join } from 'path';

// Where a Supabase auth email sends you is baked in when the email is sent,
// and leaving the option out is not an error: the call succeeds, the email
// arrives, and the link quietly goes to Site URL — https://choner.io, the
// marketing site, with no way into the app.
//
// So the bug is invisible to the type checker and to any test that only
// watches the call succeed, and it is only visible in a real inbox, from a
// real build, on a real device. resendVerification() shipped without it. This
// reads the source instead, because that is the only place the omission shows.
const source = readFileSync(join(__dirname, 'api.ts'), 'utf8');

/** The exact argument text of a call, by walking parens from its opening one. */
function argumentsOf(call: string): string {
  const start = source.indexOf(call);
  if (start === -1) throw new Error(`${call} is not in api.ts — did it get renamed?`);
  let depth = 0;
  for (let i = start + call.length - 1; i < source.length; i++) {
    const c = source[i];
    if (c === '(') depth++;
    else if (c === ')') {
      depth--;
      if (depth === 0) return source.slice(start + call.length, i);
    }
  }
  throw new Error(`unbalanced parentheses after ${call}`);
}

describe('every auth email says where to come back to', () => {
  it.each([
    ['supabase.auth.signUp(', 'emailRedirectTo'],
    ['supabase.auth.resend(', 'emailRedirectTo'],
    ['supabase.auth.resetPasswordForEmail(', 'redirectTo']
  ])('%s passes %s', (call, option) => {
    expect(argumentsOf(call)).toContain(option);
  });

  // The two confirmation paths have to agree with each other as well as be
  // present at all: a resend that lands somewhere other than the original
  // link is the same bug wearing a different hat.
  it('sends the signup link and its resend to the same place', () => {
    for (const call of ['supabase.auth.signUp(', 'supabase.auth.resend(']) {
      expect(argumentsOf(call)).toMatch(/verifyEmailRedirect\(\)|redirectTo/);
    }
    // One definition, so there is nothing to keep in sync by hand.
    expect(source.match(/Linking\.createURL\('\/verify-email'\)/g)).toHaveLength(1);
  });

  // The scheme in app.json is what Linking.createURL() builds on and what has
  // to be allow-listed in Supabase. If it is ever renamed, the allow-list
  // entry (`choner://**`) stops matching and every link falls back to Site URL
  // again — with no error anywhere.
  it('still builds links on the scheme Supabase allow-lists', () => {
    const appJson = JSON.parse(readFileSync(join(__dirname, '../../app.json'), 'utf8'));
    expect(appJson.expo.scheme).toBe('choner');
  });
});
