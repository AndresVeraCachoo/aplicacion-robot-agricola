/* server/routes/robotRoutes.js */
import { Router } from "express";
import { pool } from "../config/db.js";
import { authenticateToken } from "../middlewares/auth.js";

const router = Router();

// GET: Estado del robot (Batería, Posición actual, etc.)
router.get("/estado", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM robot_estado WHERE id = 1");
    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ error: "Estado del robot no encontrado" });
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

// GET: Historial de Datos Agronómicos (ACTUALIZADO)
router.get("/datos", authenticateToken, async (req, res) => {
  try {
    // Seleccionamos TODAS las columnas nuevas ordenadas por fecha más reciente
    const result = await pool.query(`
      SELECT id, lat, lon, "timestamp", 
             humedad, temperatura_suelo, ph, 
             nitrogeno, fosforo, potasio, radiacion_solar
      FROM robot_datos 
      ORDER BY "timestamp" DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

export default router;