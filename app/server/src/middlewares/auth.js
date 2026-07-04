/**

 * @description Middlewares de seguridad para la validación de tokens JWT y control de roles de usuario.
 */

import jwt from "jsonwebtoken";
import "dotenv/config";
import { AppError } from "./errorHandler.js";

/**
 * Verifica la validez del token JWT presente en la cabecera de autorización.
 * Si es válido, inyecta los datos del usuario decodificados en el objeto de la petición (`req.user`).
 * 
 * @param {Object} req - Petición Express.
 * @param {Object} res - Respuesta Express.
 * @param {Function} next - Función Next de Express.
 * @returns {void}
 */
export const authenticateToken = (req, res, next) => {
  // Leer el token desde la cookie HttpOnly
  const token = req.cookies?.accessToken || req.headers["authorization"]?.split(" ")[1];

  if (!token) {
    return next(new AppError("Acceso denegado: Token no proporcionado", 401, "AUTH_MISSING_TOKEN"));
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      if (err.name === "TokenExpiredError") {
        return next(new AppError("Token expirado", 401, "AUTH_EXPIRED_TOKEN"));
      }
      return next(new AppError("Token inválido", 403, "AUTH_INVALID_TOKEN"));
    }
    // Inyecta el payload decodificado para que los controladores no tengan que revalidar el token
    req.user = user;
    next();
  });
};

/**
 * Verifica si el usuario autenticado tiene el rol de administrador.
 * Requiere que `authenticateToken` se haya ejecutado previamente en la cadena de middlewares.
 * 
 * @param {Object} req - Petición Express.
 * @param {Object} res - Respuesta Express.
 * @param {Function} next - Función Next de Express.
 * @returns {void}
 */
export const requireAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return next(new AppError("Acceso denegado: Se requiere rol de administrador", 403, "AUTH_FORBIDDEN"));
  }
  next();
};