import { AppError } from "../middlewares/errorHandler.js";

/**
 * Servicio encargado de la gestión y el ciclo de vida de las misiones agrícolas.
 */
export class MissionService {
  /**
   * @param {import('pg').Pool} dbPool - Pool de conexiones a PostgreSQL.
   */
  constructor(dbPool) {
    this.pool = dbPool;
  }

  /**
   * Recupera todas las misiones ordenadas por fecha de creación.
   * @returns {Promise<Array>}
   */
  async getAllMissions() {
    // Límite de seguridad por si el histórico de misiones crece demasiado
    const result = await this.pool.query("SELECT * FROM misiones ORDER BY fecha_creacion DESC LIMIT 1000");
    return result.rows;
  }

  /**
   * Registra una nueva misión procesando los datos geoespaciales.
   * @param {Object} missionData - Parámetros de configuración de la misión.
   * @returns {Promise<Object>} Misión insertada.
   */
  async createMission(missionData) {
    const { 
      nombre, tipo_tarea, ancho_trabajo, angulo_pasada, bateria_minima, 
      area_trabajo, puntos_interes, punto_retorno, fecha_programada 
    } = missionData;
    
    const query = `
      INSERT INTO misiones 
      (nombre, tipo_tarea, ancho_trabajo, angulo_pasada, bateria_minima, area_trabajo, puntos_interes, punto_retorno, fecha_programada) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
      RETURNING *;
    `;
   
    // El cliente de node-postgres (pg) requiere que los tipos complejos JSONB se pasen pre-serializados desde Node para evitar fallos.
    const values = [
      nombre, 
      tipo_tarea, 
      ancho_trabajo, 
      angulo_pasada, 
      bateria_minima, 
      typeof area_trabajo === 'object' ? JSON.stringify(area_trabajo) : area_trabajo, 
      typeof puntos_interes === 'object' ? JSON.stringify(puntos_interes) : puntos_interes, 
      typeof punto_retorno === 'object' ? JSON.stringify(punto_retorno) : punto_retorno, 
      fecha_programada
    ];
    
    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Modifica parámetros de una misión preexistente (actualización parcial).
   * @param {number|string} id - ID de la misión.
   * @param {Object} updateData - Campos a actualizar.
   * @returns {Promise<Object>}
   */
  async updateMission(id, updateData) {
    const { nombre, tipo_tarea, ancho_trabajo, angulo_pasada, bateria_minima, area_trabajo } = updateData;

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
    const result = await this.pool.query(query, values);
    
    if (result.rows.length === 0) {
      throw new AppError("Misión no encontrada", 404);
    }
    
    return result.rows[0];
  }

  /**
   * Elimina una misión y sus registros asociados usando una transacción segura.
   * @param {number|string} id - ID de la misión.
   * @returns {Promise<Object>} Confirmación de borrado.
   */
  async deleteMission(id) {
    const client = await this.pool.connect(); 
    
    try {
      await client.query('BEGIN'); 

      const check = await client.query("SELECT id FROM misiones WHERE id = $1", [id]);
      if (check.rows.length === 0) {
        throw new AppError("Misión no encontrada", 404);
      }

      // Borrado en cascada manual para garantizar integridad antes de borrar la entidad padre
      await client.query("DELETE FROM ejecuciones_mision WHERE mision_id = $1", [id]);
      await client.query("DELETE FROM misiones WHERE id = $1", [id]);

      await client.query('COMMIT'); 
      return { message: "Misión eliminada correctamente" };
    } catch (error) {
      await client.query('ROLLBACK'); 
      throw error;
    } finally {
      client.release(); 
    }
  }

  /**
   * Consulta el historial de activaciones (ejecuciones) de una misión.
   * @param {number|string} missionId - ID de la misión padre.
   * @returns {Promise<Array>}
   */
  async getMissionRuns(missionId) {
    const result = await this.pool.query(
      "SELECT * FROM ejecuciones_mision WHERE mision_id = $1 ORDER BY fecha_inicio DESC LIMIT 1000", 
      [missionId]
    );
    return result.rows;
  }

  /**
   * Crea un nuevo registro de ejecución con estado inicial 'en_curso'.
   * @param {number|string} missionId - ID de la misión a arrancar.
   * @returns {Promise<Object>}
   */
  async startMissionRun(missionId) {
    const query = `INSERT INTO ejecuciones_mision (mision_id, estado) VALUES ($1, 'en_curso') RETURNING *;`;
    const result = await this.pool.query(query, [missionId]);
    return result.rows[0];
  }

  /**
   * Actualiza el progreso y los datos telemétricos de una ejecución activa.
   * @param {number|string} runId - ID de la ejecución.
   * @param {Object} runData - Datos reportados por el robot (batería, progreso, estado).
   * @returns {Promise<Object>}
   */
  async updateMissionRun(runId, runData) {
    const { estado, fecha_fin, bateria_usada, distancia_recorrida, tiempo_transcurrido, progreso } = runData;
    
    const query = `
      UPDATE ejecuciones_mision 
      SET estado = COALESCE($1, estado), fecha_fin = COALESCE($2, fecha_fin), bateria_usada = COALESCE($3, bateria_usada),
          distancia_recorrida = COALESCE($4, distancia_recorrida), tiempo_transcurrido = COALESCE($5, tiempo_transcurrido), progreso = COALESCE($6, progreso)
      WHERE id = $7 RETURNING *;
    `;
    const values = [estado, fecha_fin, bateria_usada, distancia_recorrida, tiempo_transcurrido, progreso, runId];
    const result = await this.pool.query(query, values);
    
    if (result.rows.length === 0) {
      throw new AppError("Ejecución no encontrada", 404);
    }

    return result.rows[0];
  }
}