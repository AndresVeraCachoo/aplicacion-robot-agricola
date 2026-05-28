import { jest } from '@jest/globals';
import { MissionController } from '../missionController.js';

describe("🚜 Controlador de Misiones (MissionController)", () => {
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

  it("✅ getMisiones: Debería devolver misiones", async () => {
    mockMissionService.getAllMissions.mockResolvedValueOnce([]);
    await missionController.getMisiones(req, res, next);
    expect(res.json).toHaveBeenCalledWith([]);
  });

  it("✅ createMision: Debería devolver 201", async () => {
    mockMissionService.createMission.mockResolvedValueOnce({ id: 1 });
    await missionController.createMision(req, res, next);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("✅ updateMision: Debería actualizar", async () => {
    req.params.id = "1"; req.body = { nombre: "A" };
    mockMissionService.updateMission.mockResolvedValueOnce({ id: 1 });
    await missionController.updateMision(req, res, next);
    expect(res.json).toHaveBeenCalled();
  });

  it("✅ deleteMision: Debería borrar", async () => {
    req.params.id = "1";
    mockMissionService.deleteMission.mockResolvedValueOnce({ message: "OK" });
    await missionController.deleteMision(req, res, next);
    expect(res.json).toHaveBeenCalled();
  });

  it("✅ getEjecuciones: Debería listar ejecuciones", async () => {
    req.params.id = "1";
    mockMissionService.getMissionRuns.mockResolvedValueOnce([]);
    await missionController.getEjecuciones(req, res, next);
    expect(res.json).toHaveBeenCalled();
  });

  it("✅ iniciarEjecucion: Debería devolver 201", async () => {
    req.params.id = "1";
    mockMissionService.startMissionRun.mockResolvedValueOnce({ id: 1 });
    await missionController.iniciarEjecucion(req, res, next);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("✅ updateEjecucion: Debería actualizar", async () => {
    req.params.run_id = "1";
    mockMissionService.updateMissionRun.mockResolvedValueOnce({ id: 1 });
    await missionController.updateEjecucion(req, res, next);
    expect(res.json).toHaveBeenCalled();
  });

  describe("❌ Manejo de Errores Global", () => {
    const endpoints = [
      { method: "getMisiones", serviceMethod: "getAllMissions" },
      { method: "createMision", serviceMethod: "createMission" },
      { method: "updateMision", serviceMethod: "updateMission" },
      { method: "deleteMision", serviceMethod: "deleteMission" },
      { method: "getEjecuciones", serviceMethod: "getMissionRuns" },
      { method: "iniciarEjecucion", serviceMethod: "startMissionRun" },
      { method: "updateEjecucion", serviceMethod: "updateMissionRun" },
    ];

    it.each(endpoints)("Debería derivar errores de $method a next()", async ({ method, serviceMethod }) => {
      const errorMock = new Error("Fallo simulado en la BD");
      mockMissionService[serviceMethod].mockRejectedValueOnce(errorMock);
      
      await missionController[method](req, res, next);
      
      expect(next).toHaveBeenCalledWith(errorMock);
    });
  });
});