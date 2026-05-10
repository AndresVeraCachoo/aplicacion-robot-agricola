// server/jest.config.js
export default {
  // Entorno Node.js para backend
  testEnvironment: 'node',

  // Limpiar los mocks automáticamente entre pruebas
  clearMocks: true,

  // Archivo que se ejecuta ANTES de los tests (nuestro escudo protector)
  setupFilesAfterEnv: ['./jest.setup.js'],

  // Dónde están los tests (cualquier archivo que acabe en .js dentro de __tests__)
  testMatch: ['**/__tests__/**/*.js'],

  // CONFIGURACIÓN DE SONARQUBE
  collectCoverage: false,
  coverageDirectory: 'coverage', // Esto creará server/coverage/lcov.info
  coverageReporters: ['lcov', 'text', 'text-summary'],
  
  // Archivos a analizar para la cobertura (asumo que tu código está en src/)
  collectCoverageFrom: [
    'src/controllers/**/*.js',
    'src/routes/**/*.js',
    'src/middlewares/**/*.js',
    'src/scripts/**/*.js',
    '!**/node_modules/**',
  ],
};