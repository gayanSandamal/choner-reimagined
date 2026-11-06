import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

// Everything under app/ is a route, including a test file.
//
// expo-router builds its route table from a require.context over the whole
// directory, and `expo export:embed` walks that context when it bundles. So a
// *.test.tsx sitting beside the screen it tests gets pulled into the
// production bundle, dragging @testing-library/react-native with it — which
// imports Node's `console` module. React Native has no Node standard library,
// so the bundle step dies:
//
//   iOS Bundling failed 10016ms index.js (3449 modules)
//   It failed because the native React runtime does not include the Node
//   standard library.
//   Unable to resolve module console from
//   node_modules/@testing-library/react-native/dist/helpers/logger.js
//
// That is 6 November: app/(auth)/verify-email.test.tsx arrived with #160's
// fix and broke every build on both platforms. It failed at Bundle
// JavaScript, three steps after the compile, so the error named Metro and a
// testing library and said nothing about the file that caused it. The test
// itself was fine and still is — it just cannot live in app/.
//
// Neither the type checker nor the linter notices, so the first sign is a
// failed release build half an hour later. This is the cheap guard. The test
// runs identically from features/ or components/.
//
// Deliberately NOT placed in app/ itself: a .test.ts there reading `fs`
// would be the very thing it is checking for.

const APP_DIR = join(__dirname, '..', 'app');

function filesUnder(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...filesUnder(path));
    else out.push(path);
  }
  return out;
}

const relative = (f: string) => f.slice(APP_DIR.length + 1);

describe('the app/ directory holds routes and nothing else', () => {
  it('has no test files in it', () => {
    const offenders = filesUnder(APP_DIR)
      .filter((f) => /\.(test|spec)\.[jt]sx?$/.test(f))
      .map(relative);
    expect(offenders).toEqual([]);
  });

  // The import side of the same rule: a route that reaches for a test helper
  // drags the testing library into the bundle just as surely as a test file.
  it('never reaches for a testing library or the render harness', () => {
    const offenders = filesUnder(APP_DIR)
      .filter((f) => /\.[jt]sx?$/.test(f))
      .filter((f) => /@testing-library|from '@\/test\//.test(readFileSync(f, 'utf8')))
      .map(relative);
    expect(offenders).toEqual([]);
  });
});
