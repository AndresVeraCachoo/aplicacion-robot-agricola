// src/middlewares/errorHandler.js

// CLASE BASE DE ERRORES (Añadido errorCode para el Multiidioma del Frontend)
export class AppError extends Error {
  constructor(message, statusCode, errorCode = "INTERNAL_ERROR") {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// ENVOLTORIO ASÍNCRONO
export const catchAsync = (fn) => (req, res, next) => {
  return Promise.resolve(fn(req, res, next)).catch(next);
};

// MIDDLEWARE INTERCEPTOR GLOBAL
export const errorHandler = (err, req, res, next) => {
  // Clonamos el error de forma segura para no perder propiedades nativas de Express
  let error = Object.create(err);
  error.message = err.message;
  error.name = err.name;
  error.statusCode = err.statusCode || err.status; 
  error.errorCode = err.errorCode || "UNKNOWN_ERROR";

  // --- Errores de Base de Datos (PostgreSQL) ---
  if (err.code === "23505") error = new AppError("Registro duplicado en la base de datos.", 400, "DB_DUPLICATE_RECORD");
  if (err.code === "23503") error = new AppError("Violación de restricción relacional.", 400, "DB_FOREIGN_KEY_VIOLATION");
  if (err.code === "23502") error = new AppError("Faltan datos obligatorios para la base de datos.", 400, "DB_MISSING_DATA");
  if (err.code === "22P02") error = new AppError("Formato de dato inválido enviado a la base de datos.", 400, "DB_INVALID_FORMAT");

  // --- Errores de Validación (Zod) ---
  if (err.name === "ZodError") {
    const missingFields = err.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join(' | ');
    error = new AppError(`Error de validación -> ${missingFields}`, 400, "VALIDATION_ERROR");
    error.details = err.issues; // Enviamos los detalles crudos al frontend para que pueda pintar los inputs en rojo
  }

  // --- Errores de Seguridad (JWT) ---
  if (err.name === "JsonWebTokenError") error = new AppError("Firma de seguridad inválida.", 401, "AUTH_INVALID_TOKEN");
  if (err.name === "TokenExpiredError") error = new AppError("La sesión ha caducado.", 401, "AUTH_TOKEN_EXPIRED");

  // --- Errores Nativos de Express/Red ---
  // Captura cuando el cliente envía un JSON con comas o llaves mal puestas
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    error = new AppError("JSON mal formado en la petición.", 400, "BAD_JSON_FORMAT");
  }
  // Captura cuando intentan subir un archivo o payload más grande del límite configurado
  if (err.type === 'entity.too.large') {
    error = new AppError("Los datos enviados son demasiado grandes.", 413, "PAYLOAD_TOO_LARGE");
  }

  // LOGGING SILENCIOSO EN TESTS
  if (process.env.NODE_ENV !== "test") {
    if (error.isOperational) {
      console.error(`[ERROR OPERATIVO] ${error.statusCode || 500} [${error.errorCode}]:`, error.message);
    } else {
      console.error("💥 [ERROR CRÍTICO NO CONTROLADO]:", err);
    }
  }

  // RESPUESTA AL FRONTEND
  res.status(error.statusCode || 500).json({
    error: error.message || "Error interno del servidor",
    errorCode: error.errorCode, // <--- El Frontend usará esto para buscar en su i18n (ej: t('errors.DB_DUPLICATE_RECORD'))
    ...(error.details && { details: error.details }) 
  });
};