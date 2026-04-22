// app/server/src/middlewares/errorHandler.js

export const errorHandler = (err, req, res, next) => {
  // Registramos el error en la consola del servidor (para debugging)
  console.error("🔥 [ERROR GLOBAL]:", err.message || err);

  // Extraemos el código de estado (si el error lo trae) o usamos 500 por defecto
  const statusCode = err.statusCode || 500;

  // Enviamos la respuesta limpia al cliente
  res.status(statusCode).json({
    error: err.message || "Error interno del servidor",
  });
};