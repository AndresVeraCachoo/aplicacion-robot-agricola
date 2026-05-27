// src/middlewares/errorHandler.js

// CLASE BASE DE ERRORES
export class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
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
  let error = { ...err, message: err.message, name: err.name };

  // --- Errores de Base de Datos (PostgreSQL) ---
  if (err.code === "23505") error = new AppError("Registro duplicado en la base de datos.", 400);
  if (err.code === "23503") error = new AppError("Violación de restricción relacional.", 400);
  if (err.code === "23502") error = new AppError("Faltan datos obligatorios para la base de datos.", 400);
  if (err.code === "22P02") error = new AppError("Formato de dato inválido enviado a la base de datos.", 400);

  // --- Errores de Validación (Zod) ---
  if (err.name === "ZodError") {
    const missingFields = err.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join(' | ');
    error = new AppError(`Error de validación -> ${missingFields}`, 400);
  }

  // --- Errores de Seguridad (JWT) ---
  if (err.name === "JsonWebTokenError") error = new AppError("Firma de seguridad inválida.", 401);
  if (err.name === "TokenExpiredError") error = new AppError("La sesión ha caducado.", 401);

  // LOGGING SILENCIOSO EN TESTS
  if (process.env.NODE_ENV !== "test") {
    if (error.isOperational) {
      console.error(`[ERROR OPERATIVO] ${error.statusCode || 500}:`, error.message);
    } else {
      console.error("[ERROR CRÍTICO NO CONTROLADO]:", err);
    }
  }

  res.status(error.statusCode || 500).json({
    error: error.message || "Error interno del servidor",
  });
};