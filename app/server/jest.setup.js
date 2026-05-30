// Intercepción de los flujos estándar de salida para evitar el ruido en la consola del CI/CD 
// provocado por los logs y errores controlados generados intrínsecamente durante los tests.
globalThis.console = {
  ...console,
  // Descomentar en caso de requerir un volcado de consola para depuración local
  // log: () => {}, 
  // error: () => {},
  // warn: () => {},
};