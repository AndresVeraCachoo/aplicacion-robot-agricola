import { jest } from '@jest/globals';
import { RobotController } from '../robotController.js';

describe("🤖 Controlador del Robot (RobotController)", () => {
  let mockRobotService, robotController, req, res, next;

  beforeEach(() => {
    mockRobotService = {
      getRobotState: jest.fn(),
      getAgronomicData: jest.fn(),
      getEnergyHistory: jest.fn(),
    };
    robotController = new RobotController(mockRobotService);
    req = { query: {} };
    res = { json: jest.fn() };
    next = jest.fn();
  });

  it("✅ getEstadoRobot: Debería devolver el estado", async () => {
    mockRobotService.getRobotState.mockResolvedValueOnce({ status: "IDLE" });
    await robotController.getEstadoRobot(req, res, next);
    expect(res.json).toHaveBeenCalledWith({ status: "IDLE" });
  });

  it("✅ getDatosAgronomicos: Debería empaquetar req.query", async () => {
    req.query = { start: "fecha1", end: "fecha2", misionId: "3" };
    mockRobotService.getAgronomicData.mockResolvedValueOnce([]);
    await robotController.getDatosAgronomicos(req, res, next);
    expect(mockRobotService.getAgronomicData).toHaveBeenCalledWith({ start: "fecha1", end: "fecha2", misionId: "3" });
    expect(res.json).toHaveBeenCalledWith([]);
  });

  it("✅ getHistorialEnergia: Debería devolver el historial si tiene éxito", async () => {
    req.query = { start: "2026", end: "2027" };
    mockRobotService.getEnergyHistory.mockResolvedValueOnce([{ bateria: 100 }]);
    await robotController.getHistorialEnergia(req, res, next);
    expect(res.json).toHaveBeenCalledWith([{ bateria: 100 }]);
  });

  describe("❌ Manejo de Errores Global", () => {
    const endpoints = [
      { method: "getEstadoRobot", serviceMethod: "getRobotState" },
      { method: "getDatosAgronomicos", serviceMethod: "getAgronomicData" },
      { method: "getHistorialEnergia", serviceMethod: "getEnergyHistory" },
    ];

    it.each(endpoints)("Debería derivar errores de $method a next()", async ({ method, serviceMethod }) => {
      const errorMock = new Error("Fallo simulado");
      mockRobotService[serviceMethod].mockRejectedValueOnce(errorMock);
      
      await robotController[method](req, res, next);
      
      expect(next).toHaveBeenCalledWith(errorMock);
    });
  });
});