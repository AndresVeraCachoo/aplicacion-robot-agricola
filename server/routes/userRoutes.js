/* eslint-env node */
import { Router } from "express";
import bcrypt from "bcrypt";
import { pool } from "../config/db.js";
import { authenticateToken, requireAdmin } from "../middlewares/auth.js";

const router = Router();

// Aplicamos middlewares a TODAS las rutas de este archivo
router.use(authenticateToken, requireAdmin);

// GET: Obtener usuarios
router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT id, name, role FROM usuarios ORDER BY name ASC");
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

// POST: Crear usuario
router.post("/", async (req, res) => {
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

// PUT: Actualizar usuario
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { name, role, password } = req.body;

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

// DELETE: Eliminar usuario
router.delete("/:id", async (req, res) => {
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