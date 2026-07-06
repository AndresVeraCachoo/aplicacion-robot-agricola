import { jest } from '@jest/globals';
import { RobotController } from '../robotController.js';

describe("Controlador de Telemetría", () => {
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

  it("Debería retornar el estado actual del robot", async () => {
    mockRobotService.getRobotState.mockResolvedValueOnce({ status: "IDLE" });
    await robotController.getRobotState(req, res, next);
    expect(res.json).toHaveBeenCalledWith({ status: "IDLE" });
  });

  it("Debería extraer parámetros y solicitar datos agronómicos", async () => {
    req.query = { start: "fecha1", end: "fecha2", missionId: "3" };
    mockRobotService.getAgronomicData.mockResolvedValueOnce([]);
    await robotController.getAgronomicData(req, res, next);
    expect(mockRobotService.getAgronomicData).toHaveBeenCalledWith({ start: "fecha1", end: "fecha2", missionId: "3" });
    expect(res.json).toHaveBeenCalledWith([]);
  });

  it("Debería retornar exitosamente el historial de energía", async () => {
    req.query = { start: "2026", end: "2027" };
    mockRobotService.getEnergyHistory.mockResolvedValueOnce([{ bateria: 100 }]);
    await robotController.getEnergyHistory(req, res, next);
    expect(res.json).toHaveBeenCalledWith([{ bateria: 100 }]);
  });

  describe("Manejo Global de Excepciones", () => {
    const endpoints = [
      { method: "getRobotState", serviceMethod: "getRobotState" },
      { method: "getAgronomicData", serviceMethod: "getAgronomicData" },
      { method: "getEnergyHistory", serviceMethod: "getEnergyHistory" },
    ];

    it.each(endpoints)("Should route errors from $method to the next() middleware", async ({ method, serviceMethod }) => {
      const errorMock = new Error("Simulated failure");
      mockRobotService[serviceMethod].mockRejectedValueOnce(errorMock);
      
      await robotController[method](req, res, next);
      
      expect(next).toHaveBeenCalledWith(errorMock);
    });
  });
});
