import { AppError } from "../middlewares/errorHandler.js";

/**
 * Servicio responsable de la gestión y ciclo de vida de las misiones agrícolas utilizando Prisma.
 */
export class MissionService {
  /**
   * @param {Object} prismaClient - Cliente ORM Prisma.
   */
  constructor(prismaClient) {
    this.prisma = prismaClient;
  }

  /**
   * Recupera todas las misiones registradas ordenadas por fecha de creación descendente.
   * 
   * @returns {Promise<Array<Object>>} Lista de misiones (limitada a 1000 registros).
   */
  async getAllMissions() {
    return await this.prisma.mission.findMany({
      orderBy: { createdAt: 'desc' },
      take: 1000
    });
  }

  /**
   * Registra una nueva misión en la base de datos.
   * 
   * @param {Object} missionData - Objeto con los datos de configuración de la misión (nombres, waypoints, etc.).
   * @returns {Promise<Object>} La misión recién creada.
   */
  async createMission(missionData) {
    return await this.prisma.mission.create({
      data: missionData
    });
  }

  /**
   * Modifica los parámetros de una misión existente.
   * 
   * @param {number|string} id - Identificador único de la misión.
   * @param {Object} updateData - Campos parciales a actualizar.
   * @returns {Promise<Object>} La misión actualizada.
   * @throws {AppError} Lanza error 404 si la misión no existe.
   */
  async updateMission(id, updateData) {
    try {
      return await this.prisma.mission.update({
        where: { id: Number.parseInt(id, 10) },
        data: updateData
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new AppError("Mission not found", 404);
      }
      throw error;
    }
  }

  /**
   * Elimina una misión y sus registros asociados (el borrado en cascada lo maneja la base de datos nativamente).
   * 
   * @param {number|string} id - Identificador único de la misión a eliminar.
   * @returns {Promise<Object>} Mensaje de éxito de la operación.
   * @throws {AppError} Lanza error 404 si la misión no existe.
   */
  async deleteMission(id) {
    try {
      await this.prisma.mission.delete({
        where: { id: Number.parseInt(id, 10) }
      });
      return { message: "Mission deleted successfully" };
    } catch (error) {
      if (error.code === 'P2025') {
        throw new AppError("Mission not found", 404);
      }
      throw error;
    }
  }

  /**
   * Consulta el historial de ejecuciones asociadas a una misión específica.
   * 
   * @param {number|string} missionId - Identificador de la misión.
   * @returns {Promise<Array<Object>>} Lista de ejecuciones ordenadas por fecha de inicio (limitada a 1000 registros).
   */
  async getMissionRuns(missionId) {
    return await this.prisma.missionExecution.findMany({
      where: { missionId: Number.parseInt(missionId, 10) },
      orderBy: { startTime: 'desc' },
      take: 1000
    });
  }

  /**
   * Crea un nuevo registro de ejecución de misión inicializando su estado a 'in_progress'.
   * 
   * @param {number|string} missionId - Identificador de la misión que se va a ejecutar.
   * @returns {Promise<Object>} El registro de la nueva ejecución.
   */
  async startMissionRun(missionId) {
    return await this.prisma.missionExecution.create({
      data: {
        missionId: Number.parseInt(missionId, 10),
        status: 'in_progress'
      }
    });
  }

  /**
   * Actualiza el progreso y los datos de telemetría de una ejecución activa.
   * 
   * @param {number|string} runId - Identificador único de la ejecución.
   * @param {Object} runData - Datos parciales a actualizar (estado, cobertura, etc.).
   * @returns {Promise<Object>} El registro de ejecución actualizado.
   * @throws {AppError} Lanza error 404 si el registro de ejecución no existe.
   */
  async updateMissionRun(runId, runData) {
    try {
      return await this.prisma.missionExecution.update({
        where: { id: Number.parseInt(runId, 10) },
        data: runData
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new AppError("Execution not found", 404);
      }
      throw error;
    }
  }
}