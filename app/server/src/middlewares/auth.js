// app/server/src/middlewares/auth.js
import jwt from "jsonwebtoken";
import "dotenv/config";

// Utilidad para crear errores con código de estado
const createError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

// Verifica si el token es válido
export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader?.split(" ")[1];

  if (!token) {
    return next(createError("Acceso denegado: Token no proporcionado", 401));
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return next(createError("Token inválido o expirado", 403));
    }
    req.user = user;
    next();
  });
};

// Verifica si el usuario es administrador
export const requireAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return next(createError("Acceso denegado: Se requiere rol de administrador", 403));
  }
  next();
};