/* eslint-env node */
import { Router } from "express";
import bcrypt from "bcrypt";
import { pool } from "../config/db.js";
import { authenticateToken, requireAdmin } from "../middlewares/auth.js";

const router = Router();

// Middleware de autenticación para TODAS las rutas
router.use(authenticateToken);

// --- RUTAS DE PERFIL (Cualquier usuario logueado) ---

router.get("/profile", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, role FROM usuarios WHERE id = $1",
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

router.put("/profile/password", async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "Faltan datos requeridos" });
  }

  try {
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
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Error al actualizar la contraseña" });
  }
});

// --- RUTAS DE ADMINISTRACIÓN (Solo Admin) ---

router.get("/", requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, role FROM usuarios ORDER BY name ASC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

router.post("/", requireAdmin, async (req, res) => {
  const { name, password, role } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "INSERT INTO usuarios (name, password, role) VALUES ($1, $2, $3) RETURNING id, name, role",
      [name, hashedPassword, role]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Error al crear usuario" });
  }
});

router.put("/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { role, password, name } = req.body;

  try {
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
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Error al actualizar usuario" });
  }
});

// DELETE: Eliminar usuario (NO ELIMINAR ÚLTIMO ADMIN)
router.delete("/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    // Verificar el rol del usuario que se intenta borrar
    const userResult = await pool.query("SELECT role FROM usuarios WHERE id = $1", [id]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const isDeletingAdmin = userResult.rows[0].role === 'admin';

    // Si es admin, comprobamos que no sea el último
    if (isDeletingAdmin) {
      const countResult = await pool.query("SELECT COUNT(*) FROM usuarios WHERE role = 'admin'");
      const adminCount = Number.parseInt(countResult.rows[0].count, 10);

      if (adminCount <= 1) {
        return res.status(403).json({ 
          error: "Operación rechazada: No puedes eliminar al último administrador del sistema." 
        });
      }
    }

    // Si está bien, lo eliminamos
    await pool.query("DELETE FROM usuarios WHERE id = $1", [id]);
    res.json({ message: "Usuario eliminado" });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Error al eliminar usuario" });
  }
});

export default router;