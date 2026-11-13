import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

// Navigation hooks come from expo-router, never from @react-navigation/*.
//
// expo-router carries its own copy of the navigation library and puts its
// navigator around every screen. The separately installed @react-navigation
// package has no navigator around anything, so a hook imported from it throws
// "Couldn't find a navigation object. Is your component inside
// NavigationContainer?" the moment the screen renders.
//
// That is 13 Nov 2026: Radar imported useIsFocused from @react-navigation/native
// and the Find tab crashed on open. Types compiled and every test passed,
// because nothing in a test has a navigator either way. This is the cheap guard.

const ROOT = join(__dirname, '..');
const DIRS = ['app', 'components', 'features', 'lib', 'providers'];

function files(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...files(p));
    else if (/\.(ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
}

describe('navigation', () => {
  it('is imported from expo-router, not @react-navigation', () => {
    const offenders = DIRS.flatMap((d) => files(join(ROOT, d))).filter((f) =>
      /from\s+['"]@react-navigation\//.test(readFileSync(f, 'utf8'))
    );
    expect(offenders).toEqual([]);
  });
});
