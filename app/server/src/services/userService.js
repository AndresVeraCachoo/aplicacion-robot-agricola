import bcrypt from "bcrypt";
import { AppError } from "../middlewares/errorHandler.js";

export class UserService {
  constructor(dbPool) {
    this.pool = dbPool;
  }

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

  async getAllUsers() {
    const result = await this.pool.query("SELECT id, name, role FROM usuarios ORDER BY id ASC");
    return result.rows;
  }

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

  async deleteExistingUser(id) {
    if (["1", "2", "3"].includes(id)) {
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
          throw new AppError("Acción denegada: Debe existir al menos un administrador.", 409);
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