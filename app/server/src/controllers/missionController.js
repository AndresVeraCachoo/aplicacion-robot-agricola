/**
 * Controlador para gestionar la creación, modificación y el historial de misiones del robot.
 */
export class MissionController {
  /**
   * @param {import('../services/missionService.js').MissionService} missionService - Servicio de lógica de negocio de misiones.
   */
  constructor(missionService) {
    this.missionService = missionService;
  }

  /**
   * Obtiene la lista completa de todas las misiones registradas.
   * @param {import('express').Request} req - Petición Express.
   * @param {import('express').Response} res - Respuesta Express.
   * @param {import('express').NextFunction} next - Middleware de errores.
   * @returns {Promise<void>}
   */
  getMisiones = async (req, res, next) => {
    try {
      const misiones = await this.missionService.getAllMissions();
      res.json(misiones);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Registra una nueva configuración de misión en el sistema.
   * @param {import('express').Request} req - Petición Express.
   * @param {import('express').Response} res - Respuesta Express.
   * @param {import('express').NextFunction} next - Middleware de errores.
   * @returns {Promise<void>}
   */
  createMision = async (req, res, next) => {
    try {
      const nuevaMision = await this.missionService.createMission(req.body);
      res.status(201).json(nuevaMision);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Actualiza los parámetros de una misión existente.
   * @param {import('express').Request} req - Petición Express (req.params.id requerido).
   * @param {import('express').Response} res - Respuesta Express.
   * @param {import('express').NextFunction} next - Middleware de errores.
   * @returns {Promise<void>}
   */
  updateMision = async (req, res, next) => {
    try {
      const misionActualizada = await this.missionService.updateMission(req.params.id, req.body);
      res.json(misionActualizada);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Elimina permanentemente una misión y sus ejecuciones asociadas.
   * @param {import('express').Request} req - Petición Express.
   * @param {import('express').Response} res - Respuesta Express.
   * @param {import('express').NextFunction} next - Middleware de errores.
   * @returns {Promise<void>}
   */
  deleteMision = async (req, res, next) => {
    try {
      const resultado = await this.missionService.deleteMission(req.params.id);
      res.json(resultado);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Devuelve el historial completo de ejecuciones para una misión concreta.
   * @param {import('express').Request} req - Petición Express.
   * @param {import('express').Response} res - Respuesta Express.
   * @param {import('express').NextFunction} next - Middleware de errores.
   * @returns {Promise<void>}
   */
  getEjecuciones = async (req, res, next) => {
    try {
      const ejecuciones = await this.missionService.getMissionRuns(req.params.id);
      res.json(ejecuciones);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Registra el inicio de una nueva ejecución para una misión específica.
   * @param {import('express').Request} req - Petición Express.
   * @param {import('express').Response} res - Respuesta Express.
   * @param {import('express').NextFunction} next - Middleware de errores.
   * @returns {Promise<void>}
   */
  iniciarEjecucion = async (req, res, next) => {
    try {
      const nuevaEjecucion = await this.missionService.startMissionRun(req.params.id);
      res.status(201).json(nuevaEjecucion);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Actualiza el estado (progreso, batería, etc.) de una ejecución en curso.
   * @param {import('express').Request} req - Petición Express (req.params.run_id requerido).
   * @param {import('express').Response} res - Respuesta Express.
   * @param {import('express').NextFunction} next - Middleware de errores.
   * @returns {Promise<void>}
   */
  updateEjecucion = async (req, res, next) => {
    try {
      const ejecucionActualizada = await this.missionService.updateMissionRun(req.params.run_id, req.body);
      res.json(ejecucionActualizada);
    } catch (error) {
      next(error);
    }
  };
}