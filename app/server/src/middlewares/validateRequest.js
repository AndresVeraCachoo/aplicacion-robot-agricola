/**
 * Middleware de validación de datos estructurales usando Zod.
 * Comprueba que el cuerpo, la query y los parámetros de la petición cumplen con el esquema definido.
 * @param {import('zod').ZodSchema} schema - Esquema de validación de Zod correspondiente a la ruta.
 * @returns {Function} Función middleware de Express.
 */
export const validate = (schema) => (req, res, next) => {
  try {
    // Validamos toda la petición de una vez para que el esquema sirva como única fuente de verdad
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