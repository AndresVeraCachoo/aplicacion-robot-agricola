import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit"; 
import { pool } from "../config/db.js";
import { authenticateToken } from "../middlewares/auth.js";
import "dotenv/config";

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // Límite de 5 intentos
  message: { error: "Demasiados intentos fallidos. Por favor, espera 15 minutos." },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.body.name || req.ip;
  }
});

router.post("/login", loginLimiter, async (req, res) => {
  const { name, password } = req.body;
  if (!name || !password) {
    return res.status(400).json({ error: "Nombre de usuario y contraseña requeridos" });
  }

  try {
    const result = await pool.query("SELECT * FROM usuarios WHERE name = $1", [name]);

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
      { expiresIn: "7d" } // <-- Tu acceso ininterrumpido de 7 días
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