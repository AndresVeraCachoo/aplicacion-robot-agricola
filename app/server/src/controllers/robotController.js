/**

 * @description Controladores para monitorizar la telemetría, datos agronómicos y la energía del robot.
 */
export class RobotController {
  /**
   * @param {Object} robotService - Servicio de lógica de negocio del robot.
   */
  constructor(robotService) {
    this.robotService = robotService;
  }

  /**
   * Obtiene el estado actual y en tiempo real de los sistemas del robot.
   * 
   * @param {Object} req - Petición Express.
   * @param {Object} res - Respuesta Express.
   * @param {Function} next - Middleware para el manejo global de errores.
   * @returns {Promise<void>}
   */
  getRobotState = async (req, res, next) => {
    try {
      const state = await this.robotService.getRobotState();
      res.json(state);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Recupera los datos agronómicos capturados por el robot, aplicando filtros opcionales.
   * 
   * @param {Object} req - Petición Express (con query params opcionales: start, end, missionId).
   * @param {Object} res - Respuesta Express.
   * @param {Function} next - Middleware para el manejo global de errores.
   * @returns {Promise<void>}
   */
  getAgronomicData = async (req, res, next) => {
    try {
      // Extrae propiedades explícitas en lugar de pasar req.query entero para prevenir inyecciones de parámetros en BD
      const filters = {
        start: req.query.start,
        end: req.query.end,
        missionId: req.query.missionId,
      };
      
      const data = await this.robotService.getAgronomicData(filters);
      res.json(data);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Recupera el historial de consumo de energía y niveles de batería.
   * 
   * @param {Object} req - Petición Express (con query params opcionales: start, end, missionId).
   * @param {Object} res - Respuesta Express.
   * @param {Function} next - Middleware para el manejo global de errores.
   * @returns {Promise<void>}
   */
  getEnergyHistory = async (req, res, next) => {
    try {
      const filters = {
        start: req.query.start,
        end: req.query.end,
        missionId: req.query.missionId,
      };

      const history = await this.robotService.getEnergyHistory(filters);
      res.json(history);
    } catch (error) {
      next(error);
    }
  };
}