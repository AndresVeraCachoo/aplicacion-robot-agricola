import { AppError } from "../middlewares/errorHandler.js";

/**
 * Servicio para consultar telemetría e histórico de energía del hardware.
 */
export class RobotService {
  /**
   * @param {import('pg').Pool} dbPool - Pool de conexiones de base de datos.
   */
  constructor(dbPool) {
    this.pool = dbPool;
  }

  /**
   * Devuelve el último estado de la tabla maestro (ID = 1).
   * @returns {Promise<Object>}
   */
  async getRobotState() {
    const result = await this.pool.query("SELECT * FROM robot_estado WHERE id = 1");
    
    if (result.rows.length === 0) {
      throw new AppError("Estado del robot no encontrado", 404);
    }
    
    return result.rows[0];
  }

  /**
   * Construye una consulta SQL dinámica para extraer registros agronómicos según filtros.
   * @param {Object} params - Diccionario con filtros (start, end, misionId).
   * @returns {Promise<Array>}
   */
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

    // Filtramos la cadena 'null' explícitamente ya que clientes HTTP como Axios serializan valores nulos de esta forma
    if (misionId && misionId !== 'null' && misionId !== '') {
      whereClauses.push(`m.id = $${values.length + 1}`);
      values.push(Number.parseInt(misionId, 10));
    }

    if (whereClauses.length > 0) {
      query += " WHERE " + whereClauses.join(" AND ");
    }

    // Límite de seguridad para evitar colapsos de RAM en el servidor si hay demasiados datos
    query += ` ORDER BY d."timestamp" DESC LIMIT 2000`;

    const result = await this.pool.query(query, values);
    return result.rows;
  }

  /**
   * Construye una consulta SQL dinámica para extraer el histórico de batería.
   * Utiliza subconsultas para acotar el marco temporal si se solicita el id de una misión en concreto.
   * @param {Object} params - Diccionario con filtros.
   * @returns {Promise<Array>}
   */
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

    // Límite de seguridad para historiales muy largos
    query += ` ORDER BY "timestamp" ASC LIMIT 2000`;
    
    const result = await this.pool.query(query, values);
    return result.rows;
  }
}