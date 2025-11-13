/**
 * Jest Configuration
 * For testing VisaNet API
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Coverage settings
  collectCoverageFrom: [
    'routes/**/*.js',
    'services/**/*.js',
    'models/**/*.js',
    'middleware/**/*.js',
    'config/**/*.js',
    'utils/**/*.js',
    '!**/node_modules/**'
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },

  // Test match patterns
  testMatch: [
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js'
  ],

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

  // Verbose output
  verbose: true,

  // Test timeout
  testTimeout: 10000,

  // Clear mocks between tests
  clearMocks: true,

  // Restore mocks between tests
  restoreMocks: true
};
