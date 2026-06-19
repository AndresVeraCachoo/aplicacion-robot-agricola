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
   * Actualiza la contraseña del usuario autenticado actualmente.
   * 
   * @param {Object} req - Petición Express.
   * @param {Object} res - Respuesta Express.
   * @param {Function} next - Middleware para el manejo global de errores.
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
   * Obtiene la lista completa de usuarios del sistema (solo accesible por administradores).
   * 
   * @param {Object} req - Petición Express.
   * @param {Object} res - Respuesta Express.
   * @param {Function} next - Middleware para el manejo global de errores.
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
   * 
   * @param {Object} req - Petición Express.
   * @param {Object} res - Respuesta Express.
   * @param {Function} next - Middleware para el manejo global de errores.
   * @returns {Promise<void>}
   */
  createUser = async (req, res, next) => {
    try {
      const { name, role, password } = req.body;
      const newUser = await this.userService.createNewUser(name, role, password);
      // Devolvemos explícitamente 201 Created para cumplir con el estándar REST
      res.status(201).json(newUser);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Modifica los datos (rol, nombre, contraseña) de un usuario existente.
   * 
   * @param {Object} req - Petición Express.
   * @param {Object} res - Respuesta Express.
   * @param {Function} next - Middleware para el manejo global de errores.
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
   * 
   * @param {Object} req - Petición Express.
   * @param {Object} res - Respuesta Express.
   * @param {Function} next - Middleware para el manejo global de errores.
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
   * Actualiza la URL del avatar del perfil del usuario autenticado.
   * 
   * @param {Object} req - Petición Express.
   * @param {Object} res - Respuesta Express.
   * @param {Function} next - Middleware para el manejo global de errores.
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