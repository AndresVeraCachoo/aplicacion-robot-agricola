/**

 * @description Middleware genérico para la validación de peticiones entrantes usando esquemas de Zod.
 */

/**
 * Valida la estructura de datos de la petición usando Zod.
 * Comprueba que el body, la query y los parámetros cumplan con el esquema definido.
 * 
 * @param {Object} schema - Esquema de validación Zod correspondiente a la ruta.
 * @returns {Function} Función middleware de Express.
 */
export const validate = (schema) => (req, res, next) => {
  try {
    // Valida la petición entera de una vez para que el esquema sirva como única fuente de verdad
    schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    next();
  } catch (error) {
    next(error);
  }
};