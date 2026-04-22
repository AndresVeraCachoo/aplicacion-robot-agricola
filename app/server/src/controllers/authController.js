import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "../config/db.js";
import "dotenv/config";

// Envoltorio mágico para atrapar errores y enviarlos al ErrorHandler
const catchAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export const login = catchAsync(async (req, res, next) => {
  const { name, username, password } = req.body;
  const userIdentifier = name || username;

  if (!userIdentifier || !password) {
    return res.status(400).json({ error: "Nombre de usuario y contraseña requeridos" });
  }

  const result = await pool.query("SELECT * FROM usuarios WHERE name = $1", [userIdentifier]);

  if (result.rows.length === 0) {
    return res.status(401).json({ error: "Credenciales inválidas" });
  }

  const user = result.rows[0];
  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    return res.status(401).json({ error: "Credenciales inválidas" });
  }

  const token = jwt.sign(
    { id: user.id, name: user.name, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.json({
    token,
    user: { id: user.id, name: user.name, role: user.role },
  });
});

export const verify = (req, res) => {
  res.json({ valid: true, user: req.user });
};