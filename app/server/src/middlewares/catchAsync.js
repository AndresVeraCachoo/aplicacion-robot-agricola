/**
 * @description Wrapper asíncrono para los controladores de Express.
 * Captura automáticamente cualquier promesa rechazada (errores) y la envía al `errorHandler`.
 * Evita tener que usar bloques `try...catch` en cada método de los controladores y garantiza
 * que ningún error asíncrono rompa el servidor.
 * 
 * @param {Function} fn - Función asíncrona del controlador.
 * @returns {Function} Función middleware de Express.
 */
export const catchAsync = (fn) => {
  return (req, res, next) => {
    return Promise.resolve(fn(req, res, next)).catch(next);
  };
};
