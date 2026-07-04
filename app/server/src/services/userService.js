import bcrypt from "bcrypt";
import { AppError } from "../middlewares/errorHandler.js";

/**
 * Servicio para la gestión de cuentas de usuario, control de acceso y seguridad utilizando Prisma.
 */
export class UserService {
  /**
   * @param {Object} prismaClient - Cliente ORM Prisma.
   */
  constructor(prismaClient) {
    this.prisma = prismaClient;
  }

  /**
   * Obtiene los datos del perfil público de un usuario.
   * 
   * @param {number|string} userId - Identificador único del usuario.
   * @returns {Promise<Object>} Datos del perfil (id, nombre, rol, avatar).
   * @throws {AppError} Lanza error 404 si el usuario no existe.
   */
  async getUserProfile(userId) {
    const user = await this.prisma.user.findUnique({
      where: { id: Number.parseInt(userId, 10) },
      select: { id: true, name: true, role: true, avatar: true }
    });

    if (!user) {
      throw new AppError("User not found", 404);
    }

    return user;
  }

  /**
   * Cambia la contraseña de un usuario validando primero su contraseña actual.
   * 
   * @param {number|string} userId - Identificador del usuario.
   * @param {string} currentPassword - Contraseña actual en texto plano para verificar la identidad.
   * @param {string} newPassword - Nueva contraseña en texto plano que será encriptada.
   * @returns {Promise<Object>} Mensaje confirmando la actualización.
   * @throws {AppError} Lanza error 400 si la contraseña actual no coincide o 404 si el usuario no existe.
   */
  async updateUserPassword(userId, currentPassword, newPassword) {
    const user = await this.prisma.user.findUnique({
      where: { id: Number.parseInt(userId, 10) }
    });

    if (!user) {
      throw new AppError("User not found", 404);
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      throw new AppError("Current password is incorrect", 400);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    await this.prisma.user.update({
      where: { id: Number.parseInt(userId, 10) },
      data: { password: hashedPassword }
    });

    return { message: "Password updated successfully" };
  }

  /**
   * Lista todos los usuarios registrados en el sistema.
   * 
   * @returns {Promise<Array<Object>>} Lista de usuarios ordenados por ID (limitada a 1000 registros).
   */
  async getAllUsers() {
    return await this.prisma.user.findMany({
      select: { id: true, name: true, role: true },
      orderBy: { id: 'asc' },
      take: 1000
    });
  }

  /**
   * Crea una nueva cuenta en el sistema garantizando que no haya nombres duplicados.
   * 
   * @param {string} name - Nombre de usuario (debe ser único).
   * @param {string} role - Rol asignado ('admin' o 'operator').
   * @param {string} password - Contraseña en texto plano (se almacenará hasheada).
   * @returns {Promise<Object>} Datos del usuario recién creado.
   * @throws {AppError} Lanza error 409 si el nombre de usuario ya está en uso.
   */
  async createNewUser(name, role, password, email) {
    const userExists = await this.prisma.user.findUnique({
      where: { name }
    });
    
    if (userExists) {
      throw new AppError("Username is already in use", 409);
    }

    if (email) {
      const emailExists = await this.prisma.user.findUnique({ where: { email } });
      if (emailExists) {
        throw new AppError("Email is already in use", 409);
      }
    }

    let finalPassword = password;
    let generatedPassword = null;

    if (!password && email) {
      const crypto = await import('node:crypto');
      generatedPassword = crypto.randomBytes(6).toString('hex'); // 12 chars temp pass
      finalPassword = generatedPassword;
    } else if (!password) {
      throw new AppError("Password is required if no email is provided", 400);
    }

    const hashedPassword = await bcrypt.hash(finalPassword, 10);

    const newUser = await this.prisma.user.create({
      data: {
        name,
        role,
        password: hashedPassword
      },
      select: { id: true, name: true, role: true }
    });

    return { user: newUser, generatedPassword };
  }

  /**
   * Actualización parcial del modelo de usuario. Si no se proporciona contraseña, se omite su modificación.
   * 
   * @param {number|string} id - Identificador del usuario.
   * @param {string} name - Nuevo nombre de usuario.
   * @param {string} role - Nuevo rol ('admin' o 'operator').
   * @param {string} [password] - (Opcional) Nueva contraseña en texto plano.
   * @returns {Promise<Object>} Mensaje de confirmación.
   * @throws {AppError} Lanza error 404 si el usuario no existe.
   */
  async updateExistingUser(id, name, role, password) {
    try {
      const updateData = { name, role };
      
      if (password) {
        updateData.password = await bcrypt.hash(password, 10);
      }

      await this.prisma.user.update({
        where: { id: Number.parseInt(id, 10) },
        data: updateData
      });

      return { message: "User updated" };
    } catch (error) {
      if (error.code === 'P2025') {
        throw new AppError("User not found", 404);
      }
      throw error;
    }
  }

  /**
   * Elimina un usuario, protegiendo las cuentas maestras del sistema y garantizando que quede al menos un administrador.
   * 
   * @param {number|string} id - Identificador del usuario a eliminar.
   * @returns {Promise<Object>} Mensaje de éxito de la operación.
   * @throws {AppError} Lanza error 409 si se intenta borrar cuentas por defecto o al último administrador.
   */
  async deleteExistingUser(id) {
    if (["1", "2", "3"].includes(String(id))) {
      throw new AppError("Access denied: Default system users cannot be deleted.", 409);
    }

    return await this.prisma.$transaction(async (tx) => {
      const userResult = await tx.user.findUnique({
        where: { id: Number.parseInt(id, 10) },
        select: { role: true }
      });

      if (!userResult) {
        throw new AppError("User not found", 404);
      }

      if (userResult.role === "admin") {
        const adminCount = await tx.user.count({
          where: { role: 'admin' }
        });
        
        if (adminCount <= 1) {
          throw new AppError("Access denied: There must be at least one administrator in the system.", 409);
        }
      }

      await tx.user.delete({
        where: { id: Number.parseInt(id, 10) }
      });

      return { message: "User deleted successfully" };
    });
  }

  /**
   * Actualiza la URL de la imagen de perfil (avatar) de un usuario específico.
   * 
   * @param {number|string} userId - Identificador del usuario.
   * @param {string} avatarUrl - URL de la nueva imagen de perfil.
   * @returns {Promise<Object>} Mensaje de confirmación y el objeto usuario actualizado.
   * @throws {AppError} Lanza error 404 si el usuario no existe.
   */
  async updateUserAvatar(userId, avatarUrl) {
    try {
      const updatedUser = await this.prisma.user.update({
        where: { id: Number.parseInt(userId, 10) },
        data: { avatar: avatarUrl },
        select: { id: true, name: true, role: true, avatar: true }
      });

      return { message: "Avatar updated", user: updatedUser };
    } catch (error) {
      if (error.code === 'P2025') {
        throw new AppError("User not found", 404);
      }
      throw error;
    }
  }
}