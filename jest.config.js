// Two projects, one `npm test`.
//
//   logic    *.test.ts   pure functions, ts-jest, node. Fast, and most of the
//                        suite: rules that must hold whichever screen calls
//                        them.
//   render   *.test.tsx  components, rendered with the Expo preset and React
//                        Native Testing Library. For what only shows up once
//                        something is on screen: which buttons a state offers.
const alias = { '^@/(.*)$': '<rootDir>/$1' };
const ignore = ['/node_modules/', '/dist/', '/ios/', '/android/'];

/** @type {import('jest').Config} */
module.exports = {
  projects: [
    {
      displayName: 'logic',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/**/*.test.ts'],
      testPathIgnorePatterns: ignore,
      moduleNameMapper: {
        ...alias,
        // matching.ts imports './reflections.ts' with an explicit extension so
        // the partner-match edge function can resolve it under Deno. ts-jest
        // resolves node-style, so strip the extension back off here.
        '^(\\.{1,2}/.*)\\.ts$': '$1'
      }
    },
    {
      displayName: 'render',
      preset: 'jest-expo',
      testMatch: ['<rootDir>/**/*.test.tsx'],
      testPathIgnorePatterns: ignore,
      setupFiles: ['<rootDir>/test/render-setup.ts'],
      moduleNameMapper: alias
    }
  ]
};
