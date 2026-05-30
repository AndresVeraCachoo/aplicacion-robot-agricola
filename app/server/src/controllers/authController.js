/**
 * Controlador para gestionar la autenticación y sesiones de los usuarios.
 */
export class AuthController {
  /**
   * @param {import('../services/authService.js').AuthService} authService - Servicio de lógica de negocio de autenticación.
   */
  constructor(authService) {
    this.authService = authService;
  }

  /**
   * Autentica a un usuario en el sistema y devuelve sus datos junto con un token JWT.
   * @param {import('express').Request} req - Petición Express (body validado previamente por Zod).
   * @param {import('express').Response} res - Respuesta Express.
   * @param {import('express').NextFunction} next - Middleware para el manejo global de errores.
   * @returns {Promise<void>}
   */
  login = async (req, res, next) => {
    try {
      // Confiamos ciegamente en req.body porque el middleware de Zod previo bloquea cualquier petición malformada
      const { name, password } = req.body; 
      const authData = await this.authService.loginUser(name, password);
      res.json(authData);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Verifica si el token de sesión actual es válido devolviendo los datos del usuario.
   * @param {import('express').Request} req - Petición Express (con el payload del usuario inyectado).
   * @param {import('express').Response} res - Respuesta Express.
   * @returns {void}
   */
  verify = (req, res) => {
    // Si la petición llega aquí, el middleware authenticateToken ya ha validado la firma del JWT
    res.json({ valid: true, user: req.user });
  };
}