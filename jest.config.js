module.exports = {
  preset: 'jest-expo',
  testEnvironment: '<rootDir>/src/test/timezoneEnvironment.js',
  testEnvironmentOptions: { timezone: 'America/Bogota' },
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  // Margen para máquinas cargadas: un test que agota el tope deja su cuerpo
  // async en marcha y contamina al siguiente.
  testTimeout: 20000,
  maxWorkers: '50%',
};
