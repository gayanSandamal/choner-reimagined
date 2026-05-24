/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/**/*.test.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/ios/', '/android/'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
};
