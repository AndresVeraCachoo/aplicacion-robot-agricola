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
  login = async (req, res, next) => {
    try {
      // Confiamos en req.body porque el middleware previo de Zod bloquea cualquier petición malformada
      const { name, password } = req.body; 
      const authData = await this.authService.loginUser(name, password);
      res.json(authData);
    } catch (error) {
      next(error);
    }
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