module.exports = {
  preset: 'jest-expo',
  testEnvironment: '<rootDir>/src/test/timezoneEnvironment.js',
  testEnvironmentOptions: { timezone: 'America/Bogota' },
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  // Margen para máquinas cargadas: un test que agota el tope deja su cuerpo
  // async en marcha y contamina al siguiente.
  testTimeout: 20000,
  maxWorkers: '50%',
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.test.{ts,tsx}',
    '!src/test/**',
    '!src/__tests__/**',
    '!src/**/*.cases.ts',
  ],
  coverageReporters: ['text-summary', 'lcov'],
  coverageThreshold: {
    global: { lines: 80, branches: 80, functions: 80, statements: 80 },
  },
};
