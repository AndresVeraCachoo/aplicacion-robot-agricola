// app/server/jest.e2e.config.js
export default {
  testEnvironment: 'node',
  testMatch: ['**/tests/*.e2e.test.js'],
  
  globalSetup: './tests/config/globalSetup.js',
  setupFilesAfterEnv: ['./tests/config/setup.js'],
  globalTeardown: './tests/config/globalTeardown.js',

  // Asegurar que se genera el archivo lcov para SonarCloud
  coverageReporters: ['lcov', 'text', 'text-summary'],

  // Ignoramos lo que no es API para el coverage E2E
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "/src/scripts/",
    "/src/simulator.js",
    "/src/index.js"
  ]
};