import { jest } from '@jest/globals';
import { MissionController } from '../missionController.js';

describe("Controlador de Misiones (MissionController)", () => {
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

  it("Debería devolver el listado completo de misiones", async () => {
    mockMissionService.getAllMissions.mockResolvedValueOnce([]);
    await missionController.getMisiones(req, res, next);
    expect(res.json).toHaveBeenCalledWith([]);
  });

  it("Debería devolver código de estado 201 al registrar una misión", async () => {
    mockMissionService.createMission.mockResolvedValueOnce({ id: 1 });
    await missionController.createMision(req, res, next);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("Debería actualizar los parámetros de una misión preexistente", async () => {
    req.params.id = "1"; req.body = { nombre: "A" };
    mockMissionService.updateMission.mockResolvedValueOnce({ id: 1 });
    await missionController.updateMision(req, res, next);
    expect(res.json).toHaveBeenCalled();
  });

  it("Debería eliminar una misión por su ID", async () => {
    req.params.id = "1";
    mockMissionService.deleteMission.mockResolvedValueOnce({ message: "OK" });
    await missionController.deleteMision(req, res, next);
    expect(res.json).toHaveBeenCalled();
  });

  it("Debería listar el historial de ejecuciones de una misión específica", async () => {
    req.params.id = "1";
    mockMissionService.getMissionRuns.mockResolvedValueOnce([]);
    await missionController.getEjecuciones(req, res, next);
    expect(res.json).toHaveBeenCalled();
  });

  it("Debería devolver estado 201 al arrancar una nueva ejecución", async () => {
    req.params.id = "1";
    mockMissionService.startMissionRun.mockResolvedValueOnce({ id: 1 });
    await missionController.iniciarEjecucion(req, res, next);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("Debería procesar las métricas de actualización de una ejecución en curso", async () => {
    req.params.run_id = "1";
    mockMissionService.updateMissionRun.mockResolvedValueOnce({ id: 1 });
    await missionController.updateEjecucion(req, res, next);
    expect(res.json).toHaveBeenCalled();
  });

  describe("Manejo Global de Excepciones", () => {
    const endpoints = [
      { method: "getMisiones", serviceMethod: "getAllMissions" },
      { method: "createMision", serviceMethod: "createMission" },
      { method: "updateMision", serviceMethod: "updateMission" },
      { method: "deleteMision", serviceMethod: "deleteMission" },
      { method: "getEjecuciones", serviceMethod: "getMissionRuns" },
      { method: "iniciarEjecucion", serviceMethod: "startMissionRun" },
      { method: "updateEjecucion", serviceMethod: "updateMissionRun" },
    ];

    it.each(endpoints)("Debería derivar errores de $method al middleware next()", async ({ method, serviceMethod }) => {
      const errorMock = new Error("Fallo de base de datos simulado");
      mockMissionService[serviceMethod].mockRejectedValueOnce(errorMock);
      
      await missionController[method](req, res, next);
      
      expect(next).toHaveBeenCalledWith(errorMock);
    });
  });
});