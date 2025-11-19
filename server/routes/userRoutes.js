/* eslint-env node */
import { Router } from "express";
import bcrypt from "bcrypt";
import { pool } from "../config/db.js";
import { authenticateToken, requireAdmin } from "../middlewares/auth.js";

const router = Router();

// 1. Middleware de autenticación para TODAS las rutas (todos deben estar logueados)
router.use(authenticateToken);

// --- RUTAS DE PERFIL (Cualquier usuario logueado) ---

// GET: Obtener mi propio perfil
router.get("/profile", async (req, res) => {
  try {
    // req.user viene del token decodificado en el middleware
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

// PUT: Cambiar mi propia contraseña
router.put("/profile/password", async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "Faltan datos requeridos" });
  }

  try {
    // 1. Obtener el usuario actual para leer su hash
    const userResult = await pool.query("SELECT * FROM usuarios WHERE id = $1", [
      userId,
    ]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const user = userResult.rows[0];

    // 2. Verificar la contraseña actual
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "La contraseña actual es incorrecta" });
    }

    // 3. Hashear la nueva contraseña
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // 4. Actualizar en la DB
    await pool.query("UPDATE usuarios SET password = $1 WHERE id = $2", [
      hashedNewPassword,
      userId,
    ]);

    res.json({ message: "Contraseña actualizada correctamente" });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Error al actualizar la contraseña" });
  }
});

// --- RUTAS DE ADMINISTRACIÓN (Solo Admin) ---

// GET: Listar todos los usuarios
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

// POST: Crear usuario
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

// PUT: Actualizar otro usuario (Admin)
router.put("/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const {KXname, role, password } = req.body; // Nota: puse KXname por error en tipeo, corregido abajo a name

  try {
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      await pool.query(
        "UPDATE usuarios SET name = $1, role = $2, password = $3 WHERE id = $4",
        [req.body.name, role, hashedPassword, id]
      );
    } else {
      await pool.query(
        "UPDATE usuarios SET name = $1, role = $2 WHERE id = $3",
        [req.body.name, role, id]
      );
    }
    res.json({ message: "Usuario actualizado" });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Error al actualizar usuario" });
  }
});

// DELETE: Eliminar usuario
router.delete("/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM usuarios WHERE id = $1", [id]);
    res.json({ message: "Usuario eliminado" });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Error al eliminar usuario" });
  }
});

export default router;