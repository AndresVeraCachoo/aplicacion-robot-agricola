import { AppError } from "../middlewares/errorHandler.js";

export class MissionService {
  constructor(dbPool) {
    this.pool = dbPool;
  }

  async getAllMissions() {
    const result = await this.pool.query("SELECT * FROM misiones ORDER BY fecha_creacion DESC");
    return result.rows;
  }

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
   
    // Mantenemos tu lógica de conversión de JSON intacta para asegurar compatibilidad con Postgres
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

  async deleteMission(id) {
    const client = await this.pool.connect(); 
    
    try {
      await client.query('BEGIN'); 

      const check = await client.query("SELECT id FROM misiones WHERE id = $1", [id]);
      if (check.rows.length === 0) {
        throw new AppError("Misión no encontrada", 404);
      }

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

  async getMissionRuns(missionId) {
    const result = await this.pool.query(
      "SELECT * FROM ejecuciones_mision WHERE mision_id = $1 ORDER BY fecha_inicio DESC", 
      [missionId]
    );
    return result.rows;
  }

  async startMissionRun(missionId) {
    const query = `INSERT INTO ejecuciones_mision (mision_id, estado) VALUES ($1, 'en_curso') RETURNING *;`;
    const result = await this.pool.query(query, [missionId]);
    return result.rows[0];
  }

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