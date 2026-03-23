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

// GET: Historial de Datos Agronómicos (AQUÍ ESTÁ EL FIX DE LA MISIÓN)
router.get("/datos", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        d.id, d.lat, d.lon, d."timestamp", 
        d.humedad, d.temperatura_suelo, d.ph, 
        d.nitrogeno, d.fosforo, d.potasio, d.radiacion_solar,
        m.nombre AS nombre_mision
      FROM robot_datos d
      LEFT JOIN ejecuciones_mision e ON d.ejecucion_id = e.id
      LEFT JOIN misiones m ON e.mision_id = m.id
      ORDER BY d."timestamp" DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

export default router;