import { AppError } from "../middlewares/errorHandler.js";

export class RobotService {
  constructor(dbPool) {
    this.pool = dbPool;
  }

  async getRobotState() {
    const result = await this.pool.query("SELECT * FROM robot_estado WHERE id = 1");
    
    if (result.rows.length === 0) {
      throw new AppError("Estado del robot no encontrado", 404);
    }
    
    return result.rows[0];
  }

  async getAgronomicData({ start, end, misionId }) {
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

    if (start && end) {
      whereClauses.push(`d."timestamp" >= $${values.length + 1} AND d."timestamp" <= $${values.length + 2}`);
      values.push(start, end);
    }

    if (misionId && misionId !== 'null' && misionId !== '') {
      whereClauses.push(`m.id = $${values.length + 1}`);
      values.push(Number.parseInt(misionId, 10));
    }

    if (whereClauses.length > 0) {
      query += " WHERE " + whereClauses.join(" AND ");
    }

    query += ` ORDER BY d."timestamp" DESC`;

    const result = await this.pool.query(query, values);
    return result.rows;
  }

  async getEnergyHistory({ start, end, misionId }) {
    let query = `SELECT "timestamp", bateria_porcentaje, radiacion_solar, estado FROM historial_energia`;
    const values = [];
    const whereClauses = [];

    if (start && end) {
      whereClauses.push(`"timestamp" >= $${values.length + 1} AND "timestamp" <= $${values.length + 2}`);
      values.push(start, end);
    }

    if (misionId && misionId !== 'null' && misionId !== '') {
      whereClauses.push(`
        "timestamp" >= (SELECT fecha_inicio FROM ejecuciones_mision WHERE mision_id = $${values.length + 1} ORDER BY fecha_inicio DESC LIMIT 1)
        AND 
        "timestamp" <= (SELECT COALESCE(fecha_fin, NOW()) FROM ejecuciones_mision WHERE mision_id = $${values.length + 1} ORDER BY fecha_inicio DESC LIMIT 1)
      `);
      values.push(Number.parseInt(misionId, 10));
    }

    if (whereClauses.length > 0) {
      query += " WHERE " + whereClauses.join(" AND ");
    }

    query += ` ORDER BY "timestamp" ASC`;
    
    const result = await this.pool.query(query, values);
    return result.rows;
  }
}