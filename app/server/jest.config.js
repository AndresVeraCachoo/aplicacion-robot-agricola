// app/server/jest.config.js
export default {
  // Entorno Node.js para backend
  testEnvironment: 'node',

  // Limpiar los mocks automáticamente entre pruebas
  clearMocks: true,

  // Archivo que se ejecuta ANTES de los tests
  setupFilesAfterEnv: ['./jest.setup.js'],

  // Dónde están los tests unitarios
  testMatch: ['**/__tests__/**/*.js'],

  // CONFIGURACIÓN DE COVERAGE
  collectCoverage: false, // Se activa vía package.json script con --coverage
  coverageDirectory: 'coverage/unit', 
  coverageReporters: ['lcov', 'text', 'text-summary'],
  
  // Archivos a analizar para la cobertura
  collectCoverageFrom: [
    'src/controllers/**/*.js',
    'src/routes/**/*.js',
    'src/middlewares/**/*.js',
    '!**/node_modules/**',
    '!src/scripts/**',
    '!src/simulator.js',
    '!src/index.js'
  ],
};