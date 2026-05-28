export class RobotController {
  constructor(robotService) {
    this.robotService = robotService;
  }

  getEstadoRobot = async (req, res, next) => {
    try {
      const estado = await this.robotService.getRobotState();
      res.json(estado);
    } catch (error) {
      next(error);
    }
  };

  getDatosAgronomicos = async (req, res, next) => {
    try {
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