import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit"; 
import { pool } from "../config/db.js";
import { authenticateToken } from "../middlewares/auth.js";
import "dotenv/config";

const router = Router();

// FIX: Límite ampliado y keyGenerator eliminado para evitar el bloqueo ERR_ERL_KEY_GEN_IPV6 en Docker
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // Límite de 100 intentos en desarrollo
  message: { error: "Demasiados intentos fallidos. Por favor, espera 15 minutos." },
  standardHeaders: true,
  legacyHeaders: false
});

router.post("/login", loginLimiter, async (req, res) => {
  const { name, username, password } = req.body;
  // Aceptamos 'name' o 'username' por si el frontend varía la petición
  const userIdentifier = name || username;

  if (!userIdentifier || !password) {
    return res.status(400).json({ error: "Nombre de usuario y contraseña requeridos" });
  }

  try {
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
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

router.get("/verify", authenticateToken, (req, res) => {
  res.json({ valid: true, user: req.user });
});

export default router;