/**

 * @description Lógica centralizada para la captura, traducción y formateo de errores antes de responder al cliente.
 */

/**
 * Clase base para los errores de la aplicación.
 * Sirve para añadir el código de estado HTTP y un código interno al error estándar de Node.
 * @class AppError
 * @extends Error
 */
export class AppError extends Error {
  constructor(message, statusCode, errorCode = "INTERNAL_ERROR") {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Filtro final por el que pasan todos los errores antes de ser devueltos al usuario.
 * Transforma fallos de código o de base de datos en mensajes limpios y seguros.
 * 
 * @param {Error|AppError} err - Objeto de error capturado.
 * @param {Object} req - Petición Express.
 * @param {Object} res - Respuesta Express.
 * @param {Function} next - Función Next de Express.
 * @returns {void}
 */
export const errorHandler = (err, req, res, next) => {
  let error = Object.create(err);
  error.message = err.message;
  error.name = err.name;
  error.statusCode = err.statusCode || err.status; 
  error.errorCode = err.errorCode || "UNKNOWN_ERROR";

  // Traduce los errores de PostgreSQL en mensajes comprensibles
  if (err.code === "23505") error = new AppError("Registro duplicado en la base de datos.", 400, "DB_DUPLICATE_RECORD");
  if (err.code === "23503") error = new AppError("Violación de restricción relacional.", 400, "DB_FOREIGN_KEY_VIOLATION");
  if (err.code === "23502") error = new AppError("Faltan datos obligatorios para la base de datos.", 400, "DB_MISSING_DATA");
  if (err.code === "22P02") error = new AppError("Formato de datos inválido enviado a la base de datos.", 400, "DB_INVALID_FORMAT");

  // Si la base de datos se desconecta repentinamente, notifica sin romper el servidor
  if (err.code === "ECONNREFUSED" || err.code === "ENOTFOUND" || err.code === "57P03") {
    error = new AppError("Servicio temporalmente no disponible (Fallo de conexión interna).", 503, "SERVICE_UNAVAILABLE");
  }

  // Combina todos los fallos de validación de Zod en un solo texto
  if (err.name === "ZodError") {
    const missingFields = err.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join(' | ');
    error = new AppError(`Error de Validación -> ${missingFields}`, 400, "VALIDATION_ERROR");
    error.details = err.issues; 
  }

  // Protecciones del servidor contra fallos raros del frontend o ataques
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    error = new AppError("JSON malformado en la petición.", 400, "BAD_JSON_FORMAT");
  }
  
  if (err instanceof URIError) {
    error = new AppError("Los parámetros de la URL contienen caracteres inválidos.", 400, "MALFORMED_URI");
  }

  if (err.type === 'entity.too.large') {
    error = new AppError("Los datos enviados son demasiado grandes.", 413, "PAYLOAD_TOO_LARGE");
  }

  // Apaga los logs al pasar los tests para no ensuciar la pantalla del terminal
  if (process.env.NODE_ENV !== "test") {
    if (error.isOperational) {
      console.error(`[Error Operacional] ${error.statusCode || 500} [${error.errorCode}]:`, error.message);
    } else {
      console.error("[Error Crítico]:", err);
    }
  }

  res.status(error.statusCode || 500).json({
    error: error.message || "Error Interno del Servidor",
    errorCode: error.errorCode,
    ...(error.details && { details: error.details }) 
  });
};