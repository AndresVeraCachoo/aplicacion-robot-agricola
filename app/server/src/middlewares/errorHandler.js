// CLASE BASE DE ERRORES 
export class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Sustituye los try/catch repetitivos
export const catchAsync = (fn) => (req, res, next) => {
  return Promise.resolve(fn(req, res, next)).catch(next);
};

// MIDDLEWARE INTERCEPTOR GLOBAL
export const errorHandler = (err, req, res, next) => {
  let error = { ...err, message: err.message };

  // Interceptores de Base de Datos
  if (err.code === "23505") {
    error = new AppError("Registro duplicado en la base de datos.", 400);
  }
  if (err.code === "22P02") {
    error = new AppError("Formato de dato inválido enviado al servidor.", 400);
  }

  // Interceptores de JWT
  if (err.name === "JsonWebTokenError") {
    error = new AppError("Firma de seguridad inválida.", 401);
  }
  if (err.name === "TokenExpiredError") {
    error = new AppError("La sesión ha caducado.", 401);
  }

  // Logging controlado para que no ensucie los tests E2E
  if (process.env.NODE_ENV !== "test") {
    if (error.isOperational) {
      console.error(`⚠️ [ERROR OPERATIVO] ${error.statusCode || 500}:`, error.message);
    } else {
      console.error("💥 [ERROR CRÍTICO NO CONTROLADO]:", err);
    }
  }

  res.status(error.statusCode || 500).json({
    error: error.message || "Error interno del servidor",
  });
};