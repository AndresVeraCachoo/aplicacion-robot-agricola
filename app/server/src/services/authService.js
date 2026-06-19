import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { AppError } from "../middlewares/errorHandler.js";

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

    const token = jwt.sign(
      { id: user.id, name: user.name, role: user.role },
      this.jwtSecret,
      { expiresIn: "2h" }
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