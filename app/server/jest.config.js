// app/server/jest.config.js
export default {
  testEnvironment: 'node',
  clearMocks: true,
  setupFilesAfterEnv: ['./jest.setup.js'],
  testMatch: ['**/__tests__/**/*.js'],
  collectCoverage: false, 
  coverageDirectory: 'coverage/unit', 
  coverageReporters: ['lcov', 'text', 'text-summary'],
  
  // Archivos a analizar para la cobertura 
  collectCoverageFrom: [
    'src/controllers/**/*.js',
    'src/services/**/*.js',
    'src/routes/**/*.js',
    'src/middlewares/**/*.js',
    'src/schemas/**/*.js',
    'src/websockets/**/*.js', 
    '!**/node_modules/**',
    '!src/scripts/**',
    '!src/simulator.js',
    '!src/index.js',
    '!src/config/**' 
  ],

  // Exclusión absoluta para que no aparezcan en la tabla final con 0%
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "/src/config/",
    "/src/index.js",
    "/src/simulator.js",
    "/src/scripts/"
  ]
};