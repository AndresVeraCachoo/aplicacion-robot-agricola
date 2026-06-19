/**

 * @description Controladores para gestionar la creación, modificación y el historial de las misiones del robot.
 */
export class MissionController {
  /**
   * @param {Object} missionService - Servicio de lógica de negocio de misiones.
   */
  constructor(missionService) {
    this.missionService = missionService;
  }

  /**
   * Obtiene la lista completa de todas las misiones registradas.
   * 
   * @param {Object} req - Petición Express.
   * @param {Object} res - Respuesta Express.
   * @param {Function} next - Middleware para el manejo global de errores.
   * @returns {Promise<void>}
   */
  getMissions = async (req, res, next) => {
    try {
      const missions = await this.missionService.getAllMissions();
      res.json(missions);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Registra una nueva configuración de misión en el sistema.
   * 
   * @param {Object} req - Petición Express.
   * @param {Object} res - Respuesta Express.
   * @param {Function} next - Middleware para el manejo global de errores.
   * @returns {Promise<void>}
   */
  createMission = async (req, res, next) => {
    try {
      const newMission = await this.missionService.createMission(req.body);
      res.status(201).json(newMission);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Actualiza los parámetros de una misión existente.
   * 
   * @param {Object} req - Petición Express (requiere parámetros id o run_id).
   * @param {Object} res - Respuesta Express.
   * @param {Function} next - Middleware para el manejo global de errores.
   * @returns {Promise<void>}
   */
  updateMission = async (req, res, next) => {
    try {
      const updatedMission = await this.missionService.updateMission(req.params.id, req.body);
      res.json(updatedMission);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Elimina permanentemente una misión y sus ejecuciones asociadas.
   * 
   * @param {Object} req - Petición Express.
   * @param {Object} res - Respuesta Express.
   * @param {Function} next - Middleware para el manejo global de errores.
   * @returns {Promise<void>}
   */
  deleteMission = async (req, res, next) => {
    try {
      const result = await this.missionService.deleteMission(req.params.id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Devuelve el historial completo de ejecuciones para una misión específica.
   * 
   * @param {Object} req - Petición Express.
   * @param {Object} res - Respuesta Express.
   * @param {Function} next - Middleware para el manejo global de errores.
   * @returns {Promise<void>}
   */
  getExecutions = async (req, res, next) => {
    try {
      const executions = await this.missionService.getMissionRuns(req.params.id);
      res.json(executions);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Registra el inicio de una nueva ejecución para una misión.
   * 
   * @param {Object} req - Petición Express.
   * @param {Object} res - Respuesta Express.
   * @param {Function} next - Middleware para el manejo global de errores.
   * @returns {Promise<void>}
   */
  startExecution = async (req, res, next) => {
    try {
      const newExecution = await this.missionService.startMissionRun(req.params.id);
      res.status(201).json(newExecution);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Actualiza el estado (progreso, batería, etc.) de una ejecución en curso.
   * 
   * @param {Object} req - Petición Express (requiere parámetros id o run_id).
   * @param {Object} res - Respuesta Express.
   * @param {Function} next - Middleware para el manejo global de errores.
   * @returns {Promise<void>}
   */
  updateExecution = async (req, res, next) => {
    try {
      const updatedExecution = await this.missionService.updateMissionRun(req.params.run_id, req.body);
      res.json(updatedExecution);
    } catch (error) {
      next(error);
    }
  };
}