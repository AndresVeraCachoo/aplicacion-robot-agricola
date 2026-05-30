import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { AppError } from "../middlewares/errorHandler.js";

/**
 * Servicio encargado de la lógica de autenticación y generación de sesiones.
 */
export class AuthService {
  /**
   * @param {import('pg').Pool} dbPool - Pool de conexiones a la base de datos.
   * @param {string} jwtSecret - Clave secreta para la firma de tokens JWT.
   */
  constructor(dbPool, jwtSecret) {
    this.pool = dbPool;
    this.jwtSecret = jwtSecret;
  }

  /**
   * Valida las credenciales de un usuario y emite un token de acceso.
   * @param {string} name - Nombre de usuario.
   * @param {string} password - Contraseña en texto plano.
   * @returns {Promise<{token: string, user: Object}>} Token firmado y datos públicos del usuario.
   */
  async loginUser(name, password) {
    const result = await this.pool.query("SELECT * FROM usuarios WHERE name = $1", [name]);

    // Unificamos el mensaje de error para evitar que los atacantes averigüen si un usuario existe o no
    if (result.rows.length === 0) {
      throw new AppError("Credenciales inválidas", 401);
    }

    const user = result.rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new AppError("Credenciales inválidas", 401);
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, role: user.role },
      this.jwtSecret,
      { expiresIn: "7d" }
    );

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
      },
    };
  }
}