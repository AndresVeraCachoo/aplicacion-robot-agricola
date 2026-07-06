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
   * Establece las cookies de autenticación en la respuesta.
   * * @param {Object} res - Respuesta Express.
   * @param {string} accessToken - Token de acceso.
   * @param {string} refreshToken - Token de refresco.
   * @returns {void}
   */
  _setAuthCookies(res, accessToken, refreshToken) {
    const isProd = process.env.NODE_ENV === "production";

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
      maxAge: 15 * 60 * 1000,
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  /**
   * Autentica a un usuario en el sistema y devuelve sus datos junto con un token JWT firmado.
   * * @param {Object} req - Petición Express.
   * @param {Object} res - Respuesta Express.
   * @param {Function} next - Middleware para el manejo global de errores.
   * @returns {Promise<void>}
   */
  login = catchAsync(async (req, res, next) => {
    const { name, password } = req.body;
    
    const { user, accessToken, refreshToken } = await this.authService.loginUser(name, password);

    this._setAuthCookies(res, accessToken, refreshToken);

    res.json({
      user,
      accessToken,
    });
  });

  /**
   * Cierra la sesión del usuario eliminando las cookies de autenticación.
   * * @param {Object} req - Petición Express.
   * @param {Object} res - Respuesta Express.
   * @returns {void}
   */
  logout = (req, res) => {
    const isProd = process.env.NODE_ENV === "production";
    const cookieOptions = {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
    };

    res.clearCookie("accessToken", cookieOptions);
    res.clearCookie("refreshToken", cookieOptions);
    res.json({ message: "Sesión cerrada correctamente" });
  };

  /**
   * Verifica si el token de sesión actual es válido devolviendo los datos del usuario logueado.
   * * @param {Object} req - Petición Express.
   * @param {Object} res - Respuesta Express.
   * @returns {void}
   */
  verify = (req, res) => {
    res.json({ valid: true, user: req.user });
  };

  /**
   * Refresca el token de acceso usando el token de refresco.
   * * @param {Object} req - Petición Express.
   * @param {Object} res - Respuesta Express.
   * @param {Function} next - Middleware para el manejo global de errores.
   * @returns {Promise<void>}
   */
  refresh = catchAsync(async (req, res, next) => {
    const { refreshToken: currentRefreshToken } = req.cookies;

    if (!currentRefreshToken) {
      return res.status(401).json({ message: "No refresh token provided" });
    }

    const { accessToken, refreshToken: newRefreshToken, user } = await this.authService.refreshUserToken(currentRefreshToken);

    this._setAuthCookies(res, accessToken, newRefreshToken);

    res.json({
      user,
      accessToken,
    });
  });
}