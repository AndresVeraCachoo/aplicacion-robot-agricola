import { AppError } from "../middlewares/errorHandler.js";

/**
 * Servicio encargado de gestionar y consultar la telemetría, el estado en tiempo real y el historial energético del robot.
 */
export class RobotService {
  /**
   * @param {Object} prismaClient - Cliente ORM Prisma.
   */
  constructor(prismaClient) {
    this.prisma = prismaClient;
  }

  /**
   * Recupera el estado actual en tiempo real del robot leyendo la tabla maestra.
   * 
   * @returns {Promise<Object>} El estado actual del robot (ID=1).
   * @throws {AppError} Lanza error 404 si el estado no ha sido inicializado.
   */
  async getRobotState() {
    const state = await this.prisma.robotState.findUnique({
      where: { id: 1 }
    });
    
    if (!state) {
      throw new AppError("Robot state not found", 404);
    }
    
    return state;
  }

  /**
   * Extrae el historial de datos agronómicos y de sensores (NPK, pH, humedad) leídos por el robot.
   * Permite filtrar los datos por un rango de fechas o por una misión en concreto.
   * 
   * @param {Object} filters - Objeto con los criterios de filtrado.
   * @param {string} [filters.start] - Fecha de inicio del rango de búsqueda.
   * @param {string} [filters.end] - Fecha de fin del rango de búsqueda.
   * @param {string|number} [filters.misionId] - Identificador de la misión para filtrar solo las lecturas tomadas durante su ejecución.
   * @returns {Promise<Array<Object>>} Lista de lecturas agronómicas, formateadas y aplanadas para el frontend (limitado a 2000).
   */
  async getAgronomicData({ start, end, misionId }) {
    const where = {};
    
    if (start && end) {
      where.timestamp = { gte: new Date(start), lte: new Date(end) };
    }

    if (misionId && misionId !== 'null' && misionId !== '') {
      where.execution = {
        missionId: Number.parseInt(misionId, 10)
      };
    }

    const data = await this.prisma.robotData.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: 2000,
      include: {
        execution: {
          include: {
            mission: true
          }
        }
      }
    });

    // Mapea al formato plano esperado por el frontend
    return data.map(d => ({
      id: d.id,
      lat: d.lat,
      lon: d.lon,
      timestamp: d.timestamp,
      humidity: d.humidity,
      soilTemperature: d.soilTemperature,
      ph: d.ph,
      nitrogen: d.nitrogen,
      phosphorus: d.phosphorus,
      potassium: d.potassium,
      solarRadiation: d.solarRadiation,
      missionName: d.execution?.mission?.name || null,
      missionId: d.execution?.mission?.id || null
    }));
  }

  /**
   * Consulta el historial de niveles de batería y estado energético del robot a lo largo del tiempo.
   * Si se especifica una misión, el sistema busca automáticamente el rango de tiempo en el que dicha misión se ejecutó.
   * 
   * @param {Object} filters - Objeto con los criterios de filtrado.
   * @param {string} [filters.start] - Fecha de inicio del rango.
   * @param {string} [filters.end] - Fecha de fin del rango.
   * @param {string|number} [filters.misionId] - Identificador de la misión para extraer la energía consumida durante la misma.
   * @returns {Promise<Array<Object>>} Lista con los registros históricos de batería y radiación solar (limitado a 2000).
   */
  async getEnergyHistory({ start, end, misionId }) {
    const where = {};

    if (start && end) {
      where.timestamp = { gte: new Date(start), lte: new Date(end) };
    }

    if (misionId && misionId !== 'null' && misionId !== '') {
      const lastExecution = await this.prisma.missionExecution.findFirst({
        where: { missionId: Number.parseInt(misionId, 10) },
        orderBy: { startTime: 'desc' }
      });

      if (!lastExecution) {
        return [];
      }

      where.timestamp = {
        gte: lastExecution.startTime,
        lte: lastExecution.endTime || new Date()
      };
    }

    return await this.prisma.energyHistory.findMany({
      where,
      orderBy: { timestamp: 'asc' },
      take: 2000,
      select: {
        timestamp: true,
        batteryPercentage: true,
        solarRadiation: true,
        status: true
      }
    });
  }
}