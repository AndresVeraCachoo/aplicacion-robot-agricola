export default {
  testEnvironment: 'node',
  testMatch: ['**/tests/*.e2e.test.js'],
  
  globalSetup: './tests/config/globalSetup.js',
  setupFilesAfterEnv: ['./tests/config/setup.js'],
  globalTeardown: './tests/config/globalTeardown.js',

  // Generación de reportes de cobertura LCOV para integración con SonarCloud
  coverageReporters: ['lcov', 'text', 'text-summary'],

  // Restricción del alcance de evaluación a la capa de la API REST
  collectCoverageFrom: [
    'src/controllers/**/*.js',
    'src/routes/**/*.js',
    'src/middlewares/**/*.js',
    'src/schemas/**/*.js',
    '!src/**/__tests__/**', 
    '!**/node_modules/**',
    '!src/scripts/**',
    '!src/simulator.js',
    '!src/index.js'
  ],

  // Exclusión de scripts paralelos y motores físicos del reporte de cobertura de los tests End-to-End
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "/src/scripts/",
    "/src/simulator.js",
    "/src/index.js"
  ]
};