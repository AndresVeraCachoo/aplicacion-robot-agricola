/**
 * Controlador para monitorizar la telemetría, datos agronómicos y energía del robot.
 */
export class RobotController {
  /**
   * @param {import('../services/robotService.js').RobotService} robotService - Servicio de lógica de negocio del robot.
   */
  constructor(robotService) {
    this.robotService = robotService;
  }

  /**
   * Obtiene el estado actual en tiempo real de los sistemas del robot.
   * @param {import('express').Request} req - Petición Express.
   * @param {import('express').Response} res - Respuesta Express.
   * @param {import('express').NextFunction} next - Middleware de errores.
   * @returns {Promise<void>}
   */
  getEstadoRobot = async (req, res, next) => {
    try {
      const estado = await this.robotService.getRobotState();
      res.json(estado);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Recupera los datos agronómicos capturados por el robot con filtros opcionales.
   * @param {import('express').Request} req - Petición Express (con query params: start, end, misionId).
   * @param {import('express').Response} res - Respuesta Express.
   * @param {import('express').NextFunction} next - Middleware de errores.
   * @returns {Promise<void>}
   */
  getDatosAgronomicos = async (req, res, next) => {
    try {
      // Extraemos propiedades explícitas en lugar de pasar req.query entero para evitar inyecciones de parámetros no contemplados en la BD
      const filtros = {
        start: req.query.start,
        end: req.query.end,
        misionId: req.query.misionId,
      };
      
      const datos = await this.robotService.getAgronomicData(filtros);
      res.json(datos);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Recupera el historial de consumo energético y niveles de batería.
   * @param {import('express').Request} req - Petición Express (con query params: start, end, misionId).
   * @param {import('express').Response} res - Respuesta Express.
   * @param {import('express').NextFunction} next - Middleware de errores.
   * @returns {Promise<void>}
   */
  getHistorialEnergia = async (req, res, next) => {
    try {
      const filtros = {
        start: req.query.start,
        end: req.query.end,
        misionId: req.query.misionId,
      };

      const historial = await this.robotService.getEnergyHistory(filtros);
      res.json(historial);
    } catch (error) {
      next(error);
    }
  };
}