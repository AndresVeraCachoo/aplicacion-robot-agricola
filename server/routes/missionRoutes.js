// server/routes/missionRoutes.js
import express from "express";
import { pool } from "../config/db.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM misiones ORDER BY fecha_creacion DESC");
    res.json(result.rows);
  } catch (error) {
    console.error("Error obteniendo misiones:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.post("/", async (req, res) => {
  const { nombre, tipo_tarea, ancho_trabajo, angulo_pasada, bateria_minima, area_trabajo, puntos_interes, punto_retorno, fecha_programada } = req.body;
  try {
    const query = `
      INSERT INTO misiones 
      (nombre, tipo_tarea, ancho_trabajo, angulo_pasada, bateria_minima, area_trabajo, puntos_interes, punto_retorno, fecha_programada) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
      RETURNING *;
    `;
    const values = [nombre, tipo_tarea, ancho_trabajo, angulo_pasada, bateria_minima, area_trabajo, puntos_interes, punto_retorno, fecha_programada];
    const result = await pool.query(query, values);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error creando misión:", error);
    res.status(500).json({ error: "Error al guardar la misión" });
  }
});

router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { nombre, tipo_tarea, ancho_trabajo, angulo_pasada, bateria_minima, area_trabajo } = req.body;

  try {
    const query = `
      UPDATE misiones 
      SET nombre = COALESCE($1, nombre),
          tipo_tarea = COALESCE($2, tipo_tarea),
          ancho_trabajo = COALESCE($3, ancho_trabajo),
          angulo_pasada = COALESCE($4, angulo_pasada),
          bateria_minima = COALESCE($5, bateria_minima),
          area_trabajo = COALESCE($6, area_trabajo)
      WHERE id = $7
      RETURNING *;
    `;
    const values = [nombre, tipo_tarea, ancho_trabajo, angulo_pasada, bateria_minima, area_trabajo, id];
    
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Misión no encontrada" });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error actualizando misión:", error);
    res.status(500).json({ error: "Error al actualizar la misión" });
  }
});

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

router.post("/:id/runs", async (req, res) => {
  try {
    const { id } = req.params;
    const query = `INSERT INTO ejecuciones_mision (mision_id, estado) VALUES ($1, 'en_curso') RETURNING *;`;
    const result = await pool.query(query, [id]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error iniciando ejecución:", error);
    res.status(500).json({ error: "Error al iniciar la ejecución" });
  }
});

router.put("/runs/:run_id", async (req, res) => {
  const { run_id } = req.params;
  const { estado, fecha_fin, bateria_usada, distancia_recorrida, tiempo_transcurrido, progreso } = req.body;
  try {
    const query = `
      UPDATE ejecuciones_mision 
      SET estado = COALESCE($1, estado), fecha_fin = COALESCE($2, fecha_fin), bateria_usada = COALESCE($3, bateria_usada),
          distancia_recorrida = COALESCE($4, distancia_recorrida), tiempo_transcurrido = COALESCE($5, tiempo_transcurrido), progreso = COALESCE($6, progreso)
      WHERE id = $7 RETURNING *;
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