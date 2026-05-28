import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { AppError } from "../middlewares/errorHandler.js";

export class AuthService {
  constructor(dbPool, jwtSecret) {
    this.pool = dbPool;
    this.jwtSecret = jwtSecret;
  }

  async loginUser(name, password) {
    const result = await this.pool.query("SELECT * FROM usuarios WHERE name = $1", [name]);

    if (result.rows.length === 0) {
      throw new AppError("Credenciales inválidas", 401);
    }

    const user = result.rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new AppError("Credenciales inválidas", 401);
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, role: user.role },
      this.jwtSecret,
      { expiresIn: "7d" }
    );

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
      },
    };
  }
}