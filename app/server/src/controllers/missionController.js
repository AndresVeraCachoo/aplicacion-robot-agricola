import { pool } from "../config/db.js";

const catchAsync = (fn) => (req, res, next) => {
  return Promise.resolve(fn(req, res, next)).catch(next);
};

export const getMisiones = catchAsync(async (req, res, next) => {
  const result = await pool.query("SELECT * FROM misiones ORDER BY fecha_creacion DESC");
  res.json(result.rows);
});

export const createMision = catchAsync(async (req, res, next) => {
  const { nombre, tipo_tarea, ancho_trabajo, angulo_pasada, bateria_minima, area_trabajo, puntos_interes, punto_retorno, fecha_programada } = req.body;
  const query = `
    INSERT INTO misiones 
    (nombre, tipo_tarea, ancho_trabajo, angulo_pasada, bateria_minima, area_trabajo, puntos_interes, punto_retorno, fecha_programada) 
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
    RETURNING *;
  `;
  const values = [nombre, tipo_tarea, ancho_trabajo, angulo_pasada, bateria_minima, area_trabajo, puntos_interes, punto_retorno, fecha_programada];
  const result = await pool.query(query, values);
  res.status(201).json(result.rows[0]);
});

export const updateMision = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { nombre, tipo_tarea, ancho_trabajo, angulo_pasada, bateria_minima, area_trabajo } = req.body;

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
});

export const deleteMision = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  await pool.query("DELETE FROM misiones WHERE id = $1", [id]);
  res.json({ message: "Misión eliminada correctamente" });
});

export const getEjecuciones = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const result = await pool.query("SELECT * FROM ejecuciones_mision WHERE mision_id = $1 ORDER BY fecha_inicio DESC", [id]);
  res.json(result.rows);
});

export const iniciarEjecucion = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const query = `INSERT INTO ejecuciones_mision (mision_id, estado) VALUES ($1, 'en_curso') RETURNING *;`;
  const result = await pool.query(query, [id]);
  res.status(201).json(result.rows[0]);
});

export const updateEjecucion = catchAsync(async (req, res, next) => {
  const { run_id } = req.params;
  const { estado, fecha_fin, bateria_usada, distancia_recorrida, tiempo_transcurrido, progreso } = req.body;
  const query = `
    UPDATE ejecuciones_mision 
    SET estado = COALESCE($1, estado), fecha_fin = COALESCE($2, fecha_fin), bateria_usada = COALESCE($3, bateria_usada),
        distancia_recorrida = COALESCE($4, distancia_recorrida), tiempo_transcurrido = COALESCE($5, tiempo_transcurrido), progreso = COALESCE($6, progreso)
    WHERE id = $7 RETURNING *;
  `;
  const values = [estado, fecha_fin, bateria_usada, distancia_recorrida, tiempo_transcurrido, progreso, run_id];
  const result = await pool.query(query, values);
  res.json(result.rows[0]);
});