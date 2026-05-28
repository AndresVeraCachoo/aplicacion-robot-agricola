import { Router } from "express";
import rateLimit from "express-rate-limit";
import { pool } from "../config/db.js";
import { env } from "../config/env.js"; // Usamos el Fail-Fast de la Fase 2
import { authenticateToken } from "../middlewares/auth.js";
import { validate } from "../middlewares/validateRequest.js";
import { loginSchema } from "../schemas/authSchema.js";

// Importamos Clases
import { AuthService } from "../services/authService.js";
import { AuthController } from "../controllers/authController.js";

// Inyección de Dependencias (Wiring)
const authService = new AuthService(pool, env.JWT_SECRET);
const authController = new AuthController(authService);

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Demasiados intentos fallidos. Por favor, espera 15 minutos." },
  standardHeaders: true,
  legacyHeaders: false
});

router.post("/login", validate(loginSchema), loginLimiter, authController.login);
router.get("/verify", authenticateToken, authController.verify);

export default router;