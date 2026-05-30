/**
 * Controlador para gestionar el ciclo de vida, permisos y perfiles de los usuarios.
 */
export class UserController {
  /**
   * @param {import('../services/userService.js').UserService} userService - Servicio de lógica de negocio de usuarios.
   */
  constructor(userService) {
    this.userService = userService;
  }

  /**
   * Obtiene el perfil público del usuario actualmente autenticado.
   * @param {import('express').Request} req - Petición Express.
   * @param {import('express').Response} res - Respuesta Express.
   * @param {import('express').NextFunction} next - Middleware de errores.
   * @returns {Promise<void>}
   */
  getProfile = async (req, res, next) => {
    try {
      // req.user es inyectado de forma segura por el middleware de autenticación, no dependemos del cliente
      const profile = await this.userService.getUserProfile(req.user.id);
      res.json(profile);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Actualiza la contraseña del usuario actualmente autenticado.
   * @param {import('express').Request} req - Petición Express.
   * @param {import('express').Response} res - Respuesta Express.
   * @param {import('express').NextFunction} next - Middleware de errores.
   * @returns {Promise<void>}
   */
  updatePassword = async (req, res, next) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const result = await this.userService.updateUserPassword(req.user.id, currentPassword, newPassword);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Obtiene la lista completa de usuarios del sistema (solo administradores).
   * @param {import('express').Request} req - Petición Express.
   * @param {import('express').Response} res - Respuesta Express.
   * @param {import('express').NextFunction} next - Middleware de errores.
   * @returns {Promise<void>}
   */
  getUsers = async (req, res, next) => {
    try {
      const users = await this.userService.getAllUsers();
      res.json(users);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Registra un nuevo usuario en la base de datos.
   * @param {import('express').Request} req - Petición Express.
   * @param {import('express').Response} res - Respuesta Express.
   * @param {import('express').NextFunction} next - Middleware de errores.
   * @returns {Promise<void>}
   */
  createUser = async (req, res, next) => {
    try {
      const { name, role, password } = req.body;
      const newUser = await this.userService.createNewUser(name, role, password);
      // Devolvemos 201 Created explícitamente para cumplir con el estándar REST
      res.status(201).json(newUser);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Modifica los datos (rol, nombre, contraseña) de un usuario existente.
   * @param {import('express').Request} req - Petición Express.
   * @param {import('express').Response} res - Respuesta Express.
   * @param {import('express').NextFunction} next - Middleware de errores.
   * @returns {Promise<void>}
   */
  updateUser = async (req, res, next) => {
    try {
      const { id } = req.params;
      const { name, role, password } = req.body;
      const result = await this.userService.updateExistingUser(id, name, role, password);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Elimina permanentemente a un usuario del sistema.
   * @param {import('express').Request} req - Petición Express.
   * @param {import('express').Response} res - Respuesta Express.
   * @param {import('express').NextFunction} next - Middleware de errores.
   * @returns {Promise<void>}
   */
  deleteUser = async (req, res, next) => {
    try {
      const { id } = req.params;
      const result = await this.userService.deleteExistingUser(id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Actualiza el avatar del perfil del usuario autenticado.
   * @param {import('express').Request} req - Petición Express.
   * @param {import('express').Response} res - Respuesta Express.
   * @param {import('express').NextFunction} next - Middleware de errores.
   * @returns {Promise<void>}
   */
  updateAvatar = async (req, res, next) => {
    try {
      const { avatarUrl } = req.body;
      const result = await this.userService.updateUserAvatar(req.user.id, avatarUrl);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };
}