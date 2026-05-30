/**
 * Clase base para los errores de nuestra aplicación.
 * Sirve para añadir el código de estado HTTP (ej: 404) y un código interno al error estándar de Node.
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
 * Filtro final por el que pasan todos los errores antes de devolvérselos al usuario.
 * Transforma fallos de código o de base de datos en mensajes limpios y seguros.
 */
export const errorHandler = (err, req, res, next) => {
  let error = Object.create(err);
  error.message = err.message;
  error.name = err.name;
  error.statusCode = err.statusCode || err.status; 
  error.errorCode = err.errorCode || "UNKNOWN_ERROR";

  // Traducimos los fallos de PostgreSQL a mensajes que se puedan entender
  if (err.code === "23505") error = new AppError("Registro duplicado en la base de datos.", 400, "DB_DUPLICATE_RECORD");
  if (err.code === "23503") error = new AppError("Violación de restricción relacional.", 400, "DB_FOREIGN_KEY_VIOLATION");
  if (err.code === "23502") error = new AppError("Faltan datos obligatorios para la base de datos.", 400, "DB_MISSING_DATA");
  if (err.code === "22P02") error = new AppError("Formato de dato inválido enviado a la base de datos.", 400, "DB_INVALID_FORMAT");

  // Si la base de datos se apaga de golpe, avisamos sin romper el servidor
  if (err.code === "ECONNREFUSED" || err.code === "ENOTFOUND" || err.code === "57P03") {
    error = new AppError("Servicio temporalmente no disponible (Fallo de conexión interna).", 503, "SERVICE_UNAVAILABLE");
  }

  // Juntamos todos los fallos de validación de Zod en un solo texto
  if (err.name === "ZodError") {
    const missingFields = err.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join(' | ');
    error = new AppError(`Error de validación -> ${missingFields}`, 400, "VALIDATION_ERROR");
    error.details = err.issues; 
  }

  // Protecciones del servidor contra ataques o fallos raros del frontend
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    error = new AppError("JSON mal formado en la petición.", 400, "BAD_JSON_FORMAT");
  }
  
  if (err instanceof URIError) {
    error = new AppError("Los parámetros de la URL contienen caracteres no válidos.", 400, "MALFORMED_URI");
  }

  if (err.type === 'entity.too.large') {
    error = new AppError("Los datos enviados son demasiado grandes.", 413, "PAYLOAD_TOO_LARGE");
  }

  // Apagamos los logs cuando pasamos los tests para no ensuciar la pantalla de la terminal
  if (process.env.NODE_ENV !== "test") {
    if (error.isOperational) {
      console.error(`[Error Operativo] ${error.statusCode || 500} [${error.errorCode}]:`, error.message);
    } else {
      console.error("[Error Crítico]:", err);
    }
  }

  res.status(error.statusCode || 500).json({
    error: error.message || "Error interno del servidor",
    errorCode: error.errorCode,
    ...(error.details && { details: error.details }) 
  });
};