<<<<<<< HEAD
import nextJest from 'next/jest';

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.(ts|tsx|js|jsx|mjs)$': [
      'babel-jest',
      { configFile: './babel.config.test.js' },
    ],
  },
  transformIgnorePatterns: ['node_modules/(?!(uuid|exceljs|@tremor|d3-*)/)'],
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
  moduleDirectories: ['node_modules', '<rootDir>'],
=======
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
>>>>>>> feature/Implement_Interactive_Timeline_for_Engagement_Events
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
  ],
<<<<<<< HEAD
};

module.exports = createJestConfig(customJestConfig);
=======
}

module.exports = createJestConfig(customJestConfig)
>>>>>>> feature/Implement_Interactive_Timeline_for_Engagement_Events
