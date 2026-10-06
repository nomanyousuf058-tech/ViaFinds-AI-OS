/** @type {import('ts-jest').JestConfigWithTsJest} */
const base = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transformIgnorePatterns: [
    'node_modules/(?!(jose|@jose/.*)/)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^jose$': '<rootDir>/__tests__/__mocks__/jose.ts',
  },
};

/**
 * PHASE 4.2 split:
 *  - `npm test` runs the UNIT project only: pure logic, no database, no network,
 *    no AI provider. This is the gate that must pass in any environment.
 *  - `npm run test:integration` runs REAL_INTEGRATION against the live database
 *    and the file-backed automation job store. It asserts production evidence and
 *    therefore requires the real environment; it is never a substitute for the
 *    production run itself.
 */
module.exports = {
  projects: [
    {
      ...base,
      displayName: 'UNIT',
      testMatch: ['**/__tests__/**/*.test.ts', '**/tests/**/*.test.ts'],
      testPathIgnorePatterns: [
        '/node_modules/',
        '/\\.playwright\\./',
        '/playwright\\.config\\./',
        'PlatformRegistry\\.test\\.ts',
        '/e2e/',
        '/integration/',
        '/\\.kilo/',
      ],
    },
    {
      ...base,
      displayName: 'REAL_INTEGRATION',
      testMatch: ['**/tests/integration/**/*.test.ts'],
      testPathIgnorePatterns: ['/node_modules/', '/\\.kilo/'],
    },
  ],
};
