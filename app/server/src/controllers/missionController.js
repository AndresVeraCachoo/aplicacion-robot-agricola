export class MissionController {
  constructor(missionService) {
    this.missionService = missionService;
  }

  getMisiones = async (req, res, next) => {
    try {
      const misiones = await this.missionService.getAllMissions();
      res.json(misiones);
    } catch (error) {
      next(error);
    }
  };

  createMision = async (req, res, next) => {
    try {
      const nuevaMision = await this.missionService.createMission(req.body);
      res.status(201).json(nuevaMision);
    } catch (error) {
      next(error);
    }
  };

  updateMision = async (req, res, next) => {
    try {
      const misionActualizada = await this.missionService.updateMission(req.params.id, req.body);
      res.json(misionActualizada);
    } catch (error) {
      next(error);
    }
  };

  deleteMision = async (req, res, next) => {
    try {
      const resultado = await this.missionService.deleteMission(req.params.id);
      res.json(resultado);
    } catch (error) {
      next(error);
    }
  };

  getEjecuciones = async (req, res, next) => {
    try {
      const ejecuciones = await this.missionService.getMissionRuns(req.params.id);
      res.json(ejecuciones);
    } catch (error) {
      next(error);
    }
  };

  iniciarEjecucion = async (req, res, next) => {
    try {
      const nuevaEjecucion = await this.missionService.startMissionRun(req.params.id);
      res.status(201).json(nuevaEjecucion);
    } catch (error) {
      next(error);
    }
  };

  updateEjecucion = async (req, res, next) => {
    try {
      const ejecucionActualizada = await this.missionService.updateMissionRun(req.params.run_id, req.body);
      res.json(ejecucionActualizada);
    } catch (error) {
      next(error);
    }
  };
}