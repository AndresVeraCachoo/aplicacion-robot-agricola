import { pool } from "../config/db.js";

const catchAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export const getEstadoRobot = catchAsync(async (req, res, next) => {
  const result = await pool.query("SELECT * FROM robot_estado WHERE id = 1");
  if (result.rows.length > 0) {
    res.json(result.rows[0]);
  } else {
    res.status(404).json({ error: "Estado del robot no encontrado" });
  }
});

export const getDatosAgronomicos = catchAsync(async (req, res, next) => {
  const { start, end, misionId } = req.query;

  let query = `
    SELECT 
      d.id, d.lat, d.lon, d."timestamp", 
      d.humedad, d.temperatura_suelo, d.ph, 
      d.nitrogeno, d.fosforo, d.potasio, d.radiacion_solar,
      m.nombre AS nombre_mision, m.id AS mision_id
    FROM robot_datos d
    LEFT JOIN ejecuciones_mision e ON d.ejecucion_id = e.id
    LEFT JOIN misiones m ON e.mision_id = m.id
  `;

  const values = [];
  const whereClauses = [];

  // Filtro de Tiempo
  if (start && end) {
    whereClauses.push(`d."timestamp" >= $${values.length + 1} AND d."timestamp" <= $${values.length + 2}`);
    values.push(start, end);
  }

  // Filtro de Misiones (ID numérico)
  if (misionId && misionId !== 'null' && misionId !== '') {
    whereClauses.push(`m.id = $${values.length + 1}`);
    values.push(Number.parseInt(misionId));
  }

  if (whereClauses.length > 0) {
    query += " WHERE " + whereClauses.join(" AND ");
  }

  query += ` ORDER BY d."timestamp" DESC`;

  const result = await pool.query(query, values);
  res.json(result.rows);
});

export const getHistorialEnergia = catchAsync(async (req, res, next) => {
  const { start, end } = req.query;
  let query = `SELECT "timestamp", bateria_porcentaje, radiacion_solar, estado FROM historial_energia`;
  const values = [];

  if (start && end) {
    query += ` WHERE "timestamp" >= $1 AND "timestamp" <= $2`;
    values.push(start, end);
  }

  query += ` ORDER BY "timestamp" ASC`;
  const result = await pool.query(query, values);
  res.json(result.rows);
});