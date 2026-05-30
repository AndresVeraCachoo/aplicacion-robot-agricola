export default {
  testEnvironment: 'node',
  clearMocks: true,
  setupFilesAfterEnv: ['./jest.setup.js'],
  testMatch: ['**/__tests__/**/*.js'],
  collectCoverage: false, 
  coverageDirectory: 'coverage/unit', 
  coverageReporters: ['lcov', 'text', 'text-summary'],
  
  // Inclusión explícita para el análisis de cobertura de código
  collectCoverageFrom: [
    'src/controllers/**/*.js',
    'src/services/**/*.js',
    'src/routes/**/*.js',
    'src/middlewares/**/*.js',
    'src/schemas/**/*.js',
    'src/websockets/**/*.js', 
    '!src/**/__tests__/**', 
    '!**/node_modules/**',
    '!src/scripts/**',
    '!src/simulator.js',
    '!src/index.js',
    '!src/config/**' 
  ],

  // Exclusión de directorios de infraestructura y entrada para evitar falsos negativos en las métricas
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "/src/config/",
    "/src/index.js",
    "/src/simulator.js",
    "/src/scripts/"
  ]
};