// server/routes/missionRoutes.js
import express from "express";
import { pool } from "../config/db.js";

const router = express.Router();

// 1. Obtener todas las misiones
router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM misiones ORDER BY fecha_creacion DESC");
    res.json(result.rows);
  } catch (error) {
    console.error("Error obteniendo misiones:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// 2. Crear una nueva misión
router.post("/", async (req, res) => {
  const { 
    nombre, tipo_tarea, ancho_trabajo, angulo_pasada, 
    bateria_minima, area_trabajo, puntos_interes, punto_retorno, fecha_programada 
  } = req.body;

  try {
    const query = `
      INSERT INTO misiones 
      (nombre, tipo_tarea, ancho_trabajo, angulo_pasada, bateria_minima, area_trabajo, puntos_interes, punto_retorno, fecha_programada) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
      RETURNING *;
    `;
    const values = [
      nombre, tipo_tarea, ancho_trabajo, angulo_pasada, 
      bateria_minima, area_trabajo, puntos_interes, punto_retorno, fecha_programada
    ];
    
    const result = await pool.query(query, values);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error creando misión:", error);
    res.status(500).json({ error: "Error al guardar la misión" });
  }
});

// 3. Eliminar una misión por ID
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM misiones WHERE id = $1", [id]);
    res.json({ message: "Misión eliminada correctamente" });
  } catch (error) {
    console.error("Error eliminando misión:", error);
    res.status(500).json({ error: "Error al eliminar la misión" });
  }
});

// 4. Obtener el historial de ejecuciones de una misión específica
router.get("/:id/runs", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("SELECT * FROM ejecuciones_mision WHERE mision_id = $1 ORDER BY fecha_inicio DESC", [id]);
    res.json(result.rows);
  } catch (error) {
    console.error("Error obteniendo ejecuciones:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// 5. Iniciar una nueva ejecución (Start Run)
router.post("/:id/runs", async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      INSERT INTO ejecuciones_mision (mision_id, estado) 
      VALUES ($1, 'en_curso') 
      RETURNING *;
    `;
    const result = await pool.query(query, [id]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error iniciando ejecución:", error);
    res.status(500).json({ error: "Error al iniciar la ejecución" });
  }
});

// 6. Actualizar el estado de una ejecución (Ej: Completar, Pausar o Actualizar Progreso)
router.put("/runs/:run_id", async (req, res) => {
  const { run_id } = req.params;
  const { estado, fecha_fin, bateria_usada, distancia_recorrida, tiempo_transcurrido, progreso } = req.body;

  try {
    const query = `
      UPDATE ejecuciones_mision 
      SET estado = COALESCE($1, estado),
          fecha_fin = COALESCE($2, fecha_fin),
          bateria_usada = COALESCE($3, bateria_usada),
          distancia_recorrida = COALESCE($4, distancia_recorrida),
          tiempo_transcurrido = COALESCE($5, tiempo_transcurrido),
          progreso = COALESCE($6, progreso)
      WHERE id = $7
      RETURNING *;
    `;
    const values = [estado, fecha_fin, bateria_usada, distancia_recorrida, tiempo_transcurrido, progreso, run_id];
    
    const result = await pool.query(query, values);
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error actualizando ejecución:", error);
    res.status(500).json({ error: "Error al actualizar la ejecución" });
  }
});

export default router;