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
   * Helper privado para establecer las cookies de autenticación
   */
  _setAuthCookies(res, accessToken, refreshToken) {
    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 15 * 60 * 1000,
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
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
    
    const { accessToken, refreshToken, user } = authData;

    this._setAuthCookies(res, accessToken, refreshToken);

    res.json({ user, accessToken }); // Devolver temporalmente para compatibilidad hacia atrás
  });

  /**
   * Cierra la sesión del usuario limpiando la cookie de autenticación.
   */
  logout = (req, res) => {
    res.clearCookie("accessToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });
    res.clearCookie("refreshToken", {
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

  /**
   * Refresca el token de acceso usando el token de refresco.
   * 
   * @param {Object} req - Petición Express.
   * @param {Object} res - Respuesta Express.
   * @param {Function} next - Middleware para el manejo global de errores.
   * @returns {Promise<void>}
   */
  refresh = catchAsync(async (req, res, next) => {
    const { refreshToken: currentRefreshToken } = req.cookies;

    if (!currentRefreshToken) {
      return res.status(401).json({ message: "No refresh token provided" });
    }

    const { accessToken, refreshToken, user } = await this.authService.refreshUserToken(currentRefreshToken);

    this._setAuthCookies(res, accessToken, refreshToken);

    res.json({ user, accessToken });
  });
}