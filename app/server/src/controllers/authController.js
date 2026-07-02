import { catchAsync } from "../middlewares/catchAsync.js";

/**
 * @description Controladores para la gestión de inicio de sesión y autenticación de usuarios.
 */
export class AuthController {
  /**
   * @param {Object} authService - Servicio de lógica de negocio de autenticación.
   */
  constructor(authService) {
    this.authService = authService;
  }

  /**
   * Autentica a un usuario en el sistema y devuelve sus datos junto con un token JWT firmado.
   * 
   * @param {Object} req - Petición Express.
   * @param {Object} res - Respuesta Express.
   * @param {Function} next - Middleware para el manejo global de errores.
   * @returns {Promise<void>}
   */
  login = catchAsync(async (req, res, next) => {
    // Confiamos en req.body porque el middleware previo de Zod bloquea cualquier petición malformada
    const { name, password } = req.body; 
    const authData = await this.authService.loginUser(name, password);
    
    const { token, user } = authData;

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
    });

    res.json({ user, token }); // Devuelve el token para compatibilidad hacia atrás en la respuesta API
  });

  /**
   * Cierra la sesión del usuario limpiando la cookie de autenticación.
   */
  logout = (req, res) => {
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });
    res.json({ message: "Sesión cerrada correctamente" });
  };

  /**
   * Verifica si el token de sesión actual es válido devolviendo los datos del usuario logueado.
   * 
   * @param {Object} req - Petición Express.
   * @param {Object} res - Respuesta Express.
   * @returns {void}
   */
  verify = (req, res) => {
    // Si la petición llega aquí, el middleware authenticateToken ya ha validado la firma del JWT con éxito
    res.json({ valid: true, user: req.user });
  };
}