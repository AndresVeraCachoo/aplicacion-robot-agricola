import bcrypt from "bcrypt";
import { AppError } from "../middlewares/errorHandler.js";

/**
 * Servicio para gestión de cuentas de usuario, control de accesos y seguridad.
 */
export class UserService {
  /**
   * @param {import('pg').Pool} dbPool - Pool de conexiones de base de datos.
   */
  constructor(dbPool) {
    this.pool = dbPool;
  }

  /**
   * Devuelve los datos públicos de perfil de un usuario.
   * @param {number|string} userId - ID interno del usuario.
   * @returns {Promise<Object>}
   */
  async getUserProfile(userId) {
    const result = await this.pool.query(
      "SELECT id, name, role, avatar FROM usuarios WHERE id = $1",
      [userId]
    );

    if (result.rows.length === 0) {
      throw new AppError("Usuario no encontrado", 404);
    }

    return result.rows[0];
  }

  /**
   * Cambia la clave de acceso de un usuario tras verificar la anterior.
   * @param {number|string} userId - ID del usuario.
   * @param {string} currentPassword - Clave en texto plano actual.
   * @param {string} newPassword - Clave en texto plano nueva.
   * @returns {Promise<Object>}
   */
  async updateUserPassword(userId, currentPassword, newPassword) {
    const userResult = await this.pool.query("SELECT * FROM usuarios WHERE id = $1", [userId]);

    if (userResult.rows.length === 0) {
      throw new AppError("Usuario no encontrado", 404);
    }

    const user = userResult.rows[0];
    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      throw new AppError("La contraseña actual es incorrecta", 400);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.pool.query("UPDATE usuarios SET password = $1 WHERE id = $2", [hashedPassword, userId]);

    return { message: "Contraseña actualizada correctamente" };
  }

  /**
   * Lista todos los usuarios registrados.
   * @returns {Promise<Array>}
   */
  async getAllUsers() {
    // Límite de seguridad
    const result = await this.pool.query("SELECT id, name, role FROM usuarios ORDER BY id ASC LIMIT 1000");
    return result.rows;
  }

  /**
   * Instancia una nueva cuenta en el sistema asegurando que no existan nombres duplicados.
   * @param {string} name - Nombre de usuario (debe ser único).
   * @param {string} role - Nivel de privilegio.
   * @param {string} password - Clave a hashear.
   * @returns {Promise<Object>}
   */
  async createNewUser(name, role, password) {
    const userExists = await this.pool.query("SELECT * FROM usuarios WHERE name = $1", [name]);
    
    if (userExists.rows.length > 0) {
      throw new AppError("El nombre de usuario ya está en uso", 409);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await this.pool.query(
      "INSERT INTO usuarios (name, role, password) VALUES ($1, $2, $3) RETURNING id, name, role",
      [name, role, hashedPassword]
    );

    return result.rows[0];
  }

  /**
   * Actualización parcial del modelo de usuario. Si no se provee password, se ignora la edición de la clave.
   * @param {number|string} id - ID del objetivo.
   * @param {string} name - Nombre nuevo.
   * @param {string} role - Rol nuevo.
   * @param {string} [password] - Clave nueva (opcional).
   * @returns {Promise<Object>}
   */
  async updateExistingUser(id, name, role, password) {
    let result;

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      result = await this.pool.query(
        "UPDATE usuarios SET name = $1, role = $2, password = $3 WHERE id = $4",
        [name, role, hashedPassword, id]
      );
    } else {
      result = await this.pool.query(
        "UPDATE usuarios SET name = $1, role = $2 WHERE id = $3",
        [name, role, id]
      );
    }

    if (result.rowCount === 0) {
      throw new AppError("Usuario no encontrado", 404);
    }

    return { message: "Usuario actualizado" };
  }

  /**
   * Ejecuta la eliminación de un usuario protegiendo las cuentas maestras del sistema.
   * @param {number|string} id - ID del objetivo a eliminar.
   * @returns {Promise<Object>}
   */
  async deleteExistingUser(id) {
    // Protegemos a los usuarios principales del sistema para evitar quedarnos sin cuentas de acceso
    if (["1", "2", "3"].includes(String(id))) {
      throw new AppError("Acción denegada: Los usuarios predeterminados del sistema no pueden ser eliminados.", 409);
    }

    const client = await this.pool.connect(); 
    
    try {
      await client.query('BEGIN'); 

      const userResult = await client.query("SELECT role FROM usuarios WHERE id = $1", [id]);
      if (userResult.rows.length === 0) {
        throw new AppError("Usuario no encontrado", 404);
      }

      const isDeletingAdmin = userResult.rows[0].role === "admin";

      if (isDeletingAdmin) {
        const countResult = await client.query("SELECT COUNT(*) FROM usuarios WHERE role = 'admin'");
        if (Number.parseInt(countResult.rows[0].count, 10) <= 1) {
          throw new AppError("Acción denegada: Debe existir al menos un administrador en el sistema.", 409);
        }
      }

      await client.query("DELETE FROM usuarios WHERE id = $1", [id]);
      
      await client.query('COMMIT'); 
      return { message: "Usuario eliminado correctamente" };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release(); 
    }
  }

  /**
   * Actualiza la URL de la foto de perfil de un usuario concreto.
   * @param {number|string} userId - ID del usuario afectado.
   * @param {string} avatarUrl - Ruta a la nueva imagen.
   * @returns {Promise<Object>}
   */
  async updateUserAvatar(userId, avatarUrl) {
    const result = await this.pool.query(
      "UPDATE usuarios SET avatar = $1 WHERE id = $2 RETURNING id, name, role, avatar",
      [avatarUrl, userId]
    );

    if (result.rows.length === 0) {
      throw new AppError("Usuario no encontrado", 404);
    }

    return { message: "Avatar actualizado", user: result.rows[0] };
  }
}