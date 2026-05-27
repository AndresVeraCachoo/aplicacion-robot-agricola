import { Router } from "express";
import rateLimit from "express-rate-limit";
import { authenticateToken } from "../middlewares/auth.js";
import { validate } from "../middlewares/validateRequest.js";
import { loginSchema } from "../schemas/authSchema.js";
import { login, verify } from "../controllers/authController.js";

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Demasiados intentos fallidos. Por favor, espera 15 minutos." },
  standardHeaders: true,
  legacyHeaders: false
});

// Zod hace de portero antes de llamar a loginLimiter y a login
router.post("/login", validate(loginSchema), loginLimiter, login);
router.get("/verify", authenticateToken, verify);

export default router;