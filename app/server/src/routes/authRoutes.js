import { Router } from "express";
import rateLimit from "express-rate-limit";
import { pool } from "../config/db.js";
import { env } from "../config/env.js";
import { authenticateToken } from "../middlewares/auth.js";
import { validate } from "../middlewares/validateRequest.js";
import { loginSchema } from "../schemas/authSchema.js";

import { AuthService } from "../services/authService.js";
import { AuthController } from "../controllers/authController.js";

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

/**
 * @swagger
 * tags:
 *   name: Autenticación
 *   description: Endpoints para el inicio y verificación de sesión
*/

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Autentica un usuario en el sistema
 *     tags: [Autenticación]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 example: "admin"
 *               password:
 *                 type: string
 *                 example: "password123"
 *     responses:
 *       200:
 *         description: Inicio de sesión exitoso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   example: "eyJhbGciOiJIUzI1NiIsInR..."
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     name:
 *                       type: string
 *                       example: "admin"
 *                     role:
 *                       type: string
 *                       example: "admin"
 *                     avatar:
 *                       type: string
 *                       nullable: true
 *                       example: "/avatars/robot-fondo-verde.png"
 *       400:
 *         description: Faltan credenciales o error de formato.
 *       401:
 *         description: Credenciales incorrectas.
 *       429:
 *         description: Límite de intentos superado.
*/
router.post("/login", validate(loginSchema), loginLimiter, authController.login);

/**
 * @swagger
 * /auth/verify:
 *   get:
 *     summary: Verifica la validez del token actual
 *     tags: [Autenticación]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token válido. Devuelve los datos del usuario.
 *       401:
 *         description: No se ha proporcionado un token.
 *       403:
 *         description: El token ha expirado o es inválido.
*/
router.get("/verify", authenticateToken, authController.verify);

export default router;