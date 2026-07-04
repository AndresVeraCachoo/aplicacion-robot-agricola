import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { AppError } from "../middlewares/errorHandler.js";
import redisClient from "../config/redis.js";

/**
 * Servicio encargado de gestionar la lógica de autenticación y la generación de sesiones seguras.
 */
export class AuthService {
  /**
   * @param {Object} prismaClient - Cliente de Prisma ORM.
   * @param {string} jwtSecret - Clave secreta para firmar los tokens JWT.
   */
  constructor(prismaClient, jwtSecret) {
    this.prisma = prismaClient;
    this.jwtSecret = jwtSecret;
  }

  /**
   * Valida las credenciales de un usuario y genera un token de acceso (JWT).
   * 
   * @param {string} name - Nombre de usuario.
   * @param {string} password - Contraseña en texto plano a verificar.
   * @returns {Promise<Object>} Objeto que contiene el token JWT y los datos públicos del usuario.
   * @throws {AppError} Lanza error 401 si el usuario no existe o la contraseña es incorrecta.
   */
  async loginUser(name, password) {
    const user = await this.prisma.user.findUnique({
      where: { name }
    });

    if (!user) {
      throw new AppError("Invalid credentials", 401);
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new AppError("Invalid credentials", 401);
    }

    const accessToken = jwt.sign(
      { id: user.id, name: user.name, role: user.role },
      this.jwtSecret,
      { expiresIn: "15m" }
    );

    const refreshToken = crypto.randomBytes(40).toString("hex");

    // Guardar el refresh token en Redis con expiración de 7 días
    await redisClient.set(
      `refresh_token:${refreshToken}`,
      user.id,
      "EX",
      7 * 24 * 60 * 60
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
      },
    };
  }

  /**
   * Valida un refresh token y emite un nuevo par de tokens si es válido.
   * 
   * @param {string} refreshToken - Refresh token proporcionado por el cliente.
   * @returns {Promise<Object>} Nuevo par de tokens y datos del usuario.
   */
  async refreshUserToken(refreshToken) {
    if (!refreshToken) {
      throw new AppError("No refresh token provided", 401);
    }

    const userId = await redisClient.get(`refresh_token:${refreshToken}`);

    if (!userId) {
      throw new AppError("Invalid or expired refresh token", 401);
    }

    const user = await this.prisma.user.findUnique({
      where: { id: parseInt(userId) }
    });

    if (!user) {
      throw new AppError("User not found", 401);
    }

    // Borramos el token antiguo para cumplir el patrón "Refresh Token Rotation"
    await redisClient.del(`refresh_token:${refreshToken}`);

    const newAccessToken = jwt.sign(
      { id: user.id, name: user.name, role: user.role },
      this.jwtSecret,
      { expiresIn: "15m" }
    );

    const newRefreshToken = crypto.randomBytes(40).toString("hex");

    // Guardar el nuevo refresh token en Redis con expiración de 7 días
    await redisClient.set(
      `refresh_token:${newRefreshToken}`,
      user.id,
      "EX",
      7 * 24 * 60 * 60
    );

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
      },
    };
  }
}