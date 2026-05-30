import jwt from "jsonwebtoken";
import "dotenv/config";
import { AppError } from "./errorHandler.js";

/**
 * Middleware que verifica la validez del token JWT en la cabecera de autorización.
 * Si es válido, inyecta los datos decodificados del usuario en el objeto de la petición (req.user).
 * @param {import('express').Request} req - Petición Express.
 * @param {import('express').Response} res - Respuesta Express.
 * @param {import('express').NextFunction} next - Función Next de Express.
 * @returns {void}
 */
export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  // Extraemos asumiendo el formato estándar de cabecera "Bearer <token>"
  const token = authHeader?.split(" ")[1];

  if (!token) {
    return next(new AppError("Acceso denegado: Token no proporcionado", 401, "AUTH_MISSING_TOKEN"));
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return next(new AppError("Token inválido o expirado", 403, "AUTH_INVALID_TOKEN"));
    }
    // Inyectamos el payload decodificado para que los controladores no tengan que volver a validar el token
    req.user = user;
    next();
  });
};

/**
 * Middleware que verifica si el usuario autenticado tiene el rol de administrador.
 * Requiere que authenticateToken se haya ejecutado previamente en la cadena de middleware.
 * @param {import('express').Request} req - Petición Express.
 * @param {import('express').Response} res - Respuesta Express.
 * @param {import('express').NextFunction} next - Función Next de Express.
 * @returns {void}
 */
export const requireAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return next(new AppError("Acceso denegado: Se requiere rol de administrador", 403, "AUTH_FORBIDDEN"));
  }
  next();
};