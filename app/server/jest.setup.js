// server/jest.setup.js

// Ocultamos los console.error y console.log esperados durante la ejecución de los tests 
// para mantener la terminal limpia y legible.
globalThis.console = {
  ...console,
  // Descomenta estas líneas cuando quieras que los tests no impriman nada
  // log: () => {}, 
  // error: () => {},
  // warn: () => {},
};