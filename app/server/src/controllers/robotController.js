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
});

export const getHistorialEnergia = catchAsync(async (req, res, next) => {
  const result = await pool.query(`
    SELECT 
      "timestamp", 
      bateria_porcentaje, 
      radiacion_solar, 
      estado 
    FROM historial_energia 
    ORDER BY "timestamp" ASC
  `);
  res.json(result.rows);
});