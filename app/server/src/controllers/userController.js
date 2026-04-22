import bcrypt from "bcrypt";
import { pool } from "../config/db.js";

const catchAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export const getProfile = catchAsync(async (req, res, next) => {
  const result = await pool.query(
    "SELECT id, name, role FROM usuarios WHERE id = $1",
    [req.user.id]
  );
  if (result.rows.length === 0) {
    return res.status(404).json({ error: "Usuario no encontrado" });
  }
  res.json(result.rows[0]);
});

export const updatePassword = catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "Faltan datos requeridos" });
  }

  const userResult = await pool.query("SELECT * FROM usuarios WHERE id = $1", [userId]);

  if (userResult.rows.length === 0) {
    return res.status(404).json({ error: "Usuario no encontrado" });
  }

  const user = userResult.rows[0];
  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) {
    return res.status(401).json({ error: "La contraseña actual es incorrecta" });
  }

  const hashedNewPassword = await bcrypt.hash(newPassword, 10);
  await pool.query("UPDATE usuarios SET password = $1 WHERE id = $2", [hashedNewPassword, userId]);

  res.json({ message: "Contraseña actualizada correctamente" });
});

export const getUsers = catchAsync(async (req, res, next) => {
  const result = await pool.query(
    "SELECT id, name, role FROM usuarios ORDER BY name ASC"
  );
  res.json(result.rows);
});

export const createUser = catchAsync(async (req, res, next) => {
  const { name, password, role } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const result = await pool.query(
    "INSERT INTO usuarios (name, password, role) VALUES ($1, $2, $3) RETURNING id, name, role",
    [name, hashedPassword, role]
  );
  res.status(201).json(result.rows[0]);
});

export const updateUser = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { role, password, name } = req.body;

  if (password) {
    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query(
      "UPDATE usuarios SET name = $1, role = $2, password = $3 WHERE id = $4",
      [name, role, hashedPassword, id]
    );
  } else {
    await pool.query(
      "UPDATE usuarios SET name = $1, role = $2 WHERE id = $3",
      [name, role, id]
    );
  }
  res.json({ message: "Usuario actualizado" });
});

export const deleteUser = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  
  if (["1", "2", "3"].includes(id)) {
    return res.status(409).json({ 
      error: "Acción denegada: Los usuarios predeterminados del sistema no pueden ser eliminados." 
    });
  }

  const userResult = await pool.query("SELECT role FROM usuarios WHERE id = $1", [id]);
  if (userResult.rows.length === 0) {
    return res.status(404).json({ error: "Usuario no encontrado" });
  }

  const isDeletingAdmin = userResult.rows[0].role === 'admin';

  if (isDeletingAdmin) {
    const countResult = await pool.query("SELECT COUNT(*) FROM usuarios WHERE role = 'admin'");
    const adminCount = Number.parseInt(countResult.rows[0].count, 10);

    if (adminCount <= 1) {
      return res.status(403).json({ 
        error: "Operación rechazada: No puedes eliminar al último administrador del sistema." 
      });
    }
  }

  await pool.query("DELETE FROM usuarios WHERE id = $1", [id]);
  res.json({ message: "Usuario eliminado" });
});