/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/**/*.test.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/ios/', '/android/'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    // matching.ts imports './reflections.ts' with an explicit extension so the
    // partner-match edge function can resolve it under Deno. ts-jest resolves
    // node-style, so strip the extension back off here.
    '^(\\.{1,2}/.*)\\.ts$': '$1',
  },
};
