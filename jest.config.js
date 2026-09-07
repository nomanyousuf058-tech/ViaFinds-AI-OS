/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts', '**/tests/**/*.test.ts'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/\\.playwright\\./',
    '/playwright\\.config\\./',
    'PlatformRegistry\\.test\\.ts',
    '/e2e/',
    '/\\.kilo/',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^jose$': '<rootDir>/__tests__/__mocks__/jose.ts',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(jose|@jose/.*)/)',
  ],
};
