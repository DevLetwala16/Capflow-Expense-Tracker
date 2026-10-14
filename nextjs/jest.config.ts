import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',

  // Mirror @/ → project root (matches tsconfig paths)
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '\\.(css|less|sass|scss)$': 'identity-obj-proxy',
    '\\.(png|jpg|jpeg|gif|svg|webp|ico|woff|woff2|ttf|eot)$':
      '<rootDir>/__mocks__/fileMock.ts',
  },

  // Discover both __tests__ directories and co-located *.test.ts files
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
  ],

  // Never run tests inside node_modules or the Next.js build cache
  testPathIgnorePatterns: ['/node_modules/', '/.next/', '/__tests__/e2e/'],

  // ts-jest config — use the project's tsconfig
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.json',
    },
  },

  // Collect coverage from source files (excluding generated / config)
  collectCoverageFrom: [
    'lib/**/*.ts',
    'hooks/**/*.ts',
    '!lib/**/*.d.ts',
    '!**/__mocks__/**',
  ],
};

export default config;
