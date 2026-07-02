import { emailQueue } from "../workers/emailWorker.js";
import { catchAsync } from "../middlewares/catchAsync.js";

/**
 * @description Controladores para gestionar el ciclo de vida, permisos y perfiles de los usuarios.
 */
export class UserController {
  /**
   * @param {Object} userService - Servicio de lógica de negocio de usuarios.
   */
  constructor(userService) {
    this.userService = userService;
  }

  /**
   * Obtiene el perfil público del usuario autenticado actualmente.
   * 
   * @param {Object} req - Petición Express.
   * @param {Object} res - Respuesta Express.
   * @param {Function} next - Middleware para el manejo global de errores.
   * @returns {Promise<void>}
   */
  getProfile = catchAsync(async (req, res, next) => {
    // req.user es inyectado de forma segura por el middleware de autenticación, no dependemos del cliente
    const profile = await this.userService.getUserProfile(req.user.id);
    res.json(profile);
  });

  /**
   * Actualiza la contraseña del usuario autenticado actualmente.
   * 
   * @param {Object} req - Petición Express.
   * @param {Object} res - Respuesta Express.
   * @param {Function} next - Middleware para el manejo global de errores.
   * @returns {Promise<void>}
   */
  updatePassword = catchAsync(async (req, res, next) => {
    const { currentPassword, newPassword } = req.body;
    const result = await this.userService.updateUserPassword(req.user.id, currentPassword, newPassword);
    res.json(result);
  });

  /**
   * Obtiene la lista completa de usuarios del sistema (solo accesible por administradores).
   * 
   * @param {Object} req - Petición Express.
   * @param {Object} res - Respuesta Express.
   * @param {Function} next - Middleware para el manejo global de errores.
   * @returns {Promise<void>}
   */
  getUsers = catchAsync(async (req, res, next) => {
    const users = await this.userService.getAllUsers();
    res.json(users);
  });

  /**
   * Registra un nuevo usuario en la base de datos.
   * 
   * @param {Object} req - Petición Express.
   * @param {Object} res - Respuesta Express.
   * @param {Function} next - Middleware para el manejo global de errores.
   * @returns {Promise<void>}
   */
  createUser = catchAsync(async (req, res, next) => {
    const { name, role, password, email } = req.body;
    const { user: newUser, generatedPassword } = await this.userService.createNewUser(name, role, password, email);
    
    if (generatedPassword && email) {
      await emailQueue.add('welcomeEmail', {
        type: 'WELCOME_EMAIL',
        payload: { email, username: newUser.name, tempPassword: generatedPassword }
      });
    }

    // Devolvemos explícitamente 201 Created para cumplir con el estándar REST
    res.status(201).json(newUser);
  });

  /**
   * Modifica los datos (rol, nombre, contraseña) de un usuario existente.
   * 
   * @param {Object} req - Petición Express.
   * @param {Object} res - Respuesta Express.
   * @param {Function} next - Middleware para el manejo global de errores.
   * @returns {Promise<void>}
   */
  updateUser = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { name, role, password } = req.body;
    const result = await this.userService.updateExistingUser(id, name, role, password);
    res.json(result);
  });

  /**
   * Elimina permanentemente a un usuario del sistema.
   * 
   * @param {Object} req - Petición Express.
   * @param {Object} res - Respuesta Express.
   * @param {Function} next - Middleware para el manejo global de errores.
   * @returns {Promise<void>}
   */
  deleteUser = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const result = await this.userService.deleteExistingUser(id);
    res.json(result);
  });

  /**
   * Actualiza la URL del avatar del perfil del usuario autenticado.
   * 
   * @param {Object} req - Petición Express.
   * @param {Object} res - Respuesta Express.
   * @param {Function} next - Middleware para el manejo global de errores.
   * @returns {Promise<void>}
   */
  updateAvatar = catchAsync(async (req, res, next) => {
    const { avatarUrl } = req.body;
    const result = await this.userService.updateUserAvatar(req.user.id, avatarUrl);
    res.json(result);
  });
}