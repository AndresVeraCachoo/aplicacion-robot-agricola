import { jest } from '@jest/globals';
import { MissionController } from '../missionController.js';

describe("Controlador de Misión", () => {
  let mockMissionService, missionController, req, res, next;

  beforeEach(() => {
    mockMissionService = {
      getAllMissions: jest.fn(), createMission: jest.fn(), updateMission: jest.fn(),
      deleteMission: jest.fn(), getMissionRuns: jest.fn(), startMissionRun: jest.fn(), updateMissionRun: jest.fn(),
    };
    missionController = new MissionController(mockMissionService);
    req = { params: {}, body: {} };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
  });

  it("Debería retornar la lista completa de misiones", async () => {
    mockMissionService.getAllMissions.mockResolvedValueOnce([]);
    await missionController.getMissions(req, res, next);
    expect(res.json).toHaveBeenCalledWith([]);
  });

  it("Debería retornar código 201 al registrar una misión", async () => {
    mockMissionService.createMission.mockResolvedValueOnce({ id: 1 });
    await missionController.createMission(req, res, next);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("Debería actualizar los parámetros de una misión preexistente", async () => {
    req.params.id = "1"; req.body = { name: "A" };
    mockMissionService.updateMission.mockResolvedValueOnce({ id: 1 });
    await missionController.updateMission(req, res, next);
    expect(res.json).toHaveBeenCalled();
  });

  it("Debería eliminar una misión por su ID", async () => {
    req.params.id = "1";
    mockMissionService.deleteMission.mockResolvedValueOnce({ message: "OK" });
    await missionController.deleteMission(req, res, next);
    expect(res.json).toHaveBeenCalled();
  });

  it("Debería listar el historial de ejecuciones de una misión específica", async () => {
    req.params.id = "1";
    mockMissionService.getMissionRuns.mockResolvedValueOnce([]);
    await missionController.getExecutions(req, res, next);
    expect(res.json).toHaveBeenCalled();
  });

  it("Debería retornar estado 201 al iniciar nueva ejecución", async () => {
    req.params.id = "1";
    mockMissionService.startMissionRun.mockResolvedValueOnce({ id: 1 });
    await missionController.startExecution(req, res, next);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("Debería procesar métricas de actualización de ejecución en curso", async () => {
    req.params.run_id = "1";
    mockMissionService.updateMissionRun.mockResolvedValueOnce({ id: 1 });
    await missionController.updateExecution(req, res, next);
    expect(res.json).toHaveBeenCalled();
  });

  describe("Manejo Global de Excepciones", () => {
    const endpoints = [
      { method: "getMissions", serviceMethod: "getAllMissions" },
      { method: "createMission", serviceMethod: "createMission" },
      { method: "updateMission", serviceMethod: "updateMission" },
      { method: "deleteMission", serviceMethod: "deleteMission" },
      { method: "getExecutions", serviceMethod: "getMissionRuns" },
      { method: "startExecution", serviceMethod: "startMissionRun" },
      { method: "updateExecution", serviceMethod: "updateMissionRun" },
    ];

    it.each(endpoints)("Should route errors from $method to the next() middleware", async ({ method, serviceMethod }) => {
      const errorMock = new Error("Simulated database failure");
      mockMissionService[serviceMethod].mockRejectedValueOnce(errorMock);
      
      await missionController[method](req, res, next);
      
      expect(next).toHaveBeenCalledWith(errorMock);
    });
  });
});
