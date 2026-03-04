import jwt from "jsonwebtoken";
import "dotenv/config";

// Middleware: Verifica si el token es válido
export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Acceso denegado: Token no proporcionado" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Token inválido o expirado" });
    }
    req.user = user;
    next();
  });
};

// Middleware: Verifica si el usuario es administrador
export const requireAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Acceso denegado: Se requiere rol de administrador" });
  }
  next();
};