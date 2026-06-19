import { jest } from '@jest/globals';

describe("Servicio de Misiones", () => {
  let mockFindMany, mockCreate, mockUpdate, mockDelete;
  let MissionService;
  let missionServiceInstance;
  let fakePrisma;

  beforeEach(async () => {
    jest.resetModules();

    mockFindMany = jest.fn();
    mockCreate = jest.fn();
    mockUpdate = jest.fn();
    mockDelete = jest.fn();

    fakePrisma = {
      mission: {
        findMany: mockFindMany,
        create: mockCreate,
        update: mockUpdate,
        delete: mockDelete
      },
      missionExecution: {
        findMany: mockFindMany,
        create: mockCreate,
        update: mockUpdate
      }
    };

    const module = await import('../missionService.js');
    MissionService = module.MissionService;
    
    missionServiceInstance = new MissionService(fakePrisma);
  });

  describe("creación y actualización de misión", () => {
    it("Debería crear una misión pasando datos a Prisma nativamente", async () => {
      mockCreate.mockResolvedValueOnce({ id: 1, name: 'New' });

      const payload = {
        name: 'New', workArea: { type: 'Polygon' } 
      };

      await missionServiceInstance.createMission(payload);
      
      expect(mockCreate).toHaveBeenCalledWith({ data: payload });
    });

    it("Debería realizar actualización parcial y retornar la entidad mutada", async () => {
      mockUpdate.mockResolvedValueOnce({ id: 1, name: 'Updated' });
      
      const result = await missionServiceInstance.updateMission(1, { name: 'Updated' });
      
      expect(result.name).toBe('Updated');
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 1 },
        data: { name: 'Updated' }
      }));
    });

    it("Debería lanzar error 404 al intentar actualizar un registro inexistente", async () => {
      const error = new Error();
      error.code = 'P2025';
      mockUpdate.mockRejectedValueOnce(error);

      await expect(missionServiceInstance.updateMission(99, {})).rejects.toThrow("Mission not found");
    });

    it("Debería relanzar otros errores genéricos desde updateMission", async () => {
      const error = new Error("Database error");
      error.code = 'P5000';
      mockUpdate.mockRejectedValueOnce(error);

      await expect(missionServiceInstance.updateMission(99, {})).rejects.toThrow("Database error");
    });
  });

  describe("borrado de misión", () => {
    it("Debería abortar si la misión solicitada no existe", async () => {
      const error = new Error();
      error.code = 'P2025';
      mockDelete.mockRejectedValueOnce(error);

      await expect(missionServiceInstance.deleteMission(99)).rejects.toThrow("Mission not found");
    });

    it("Debería relanzar otros errores genéricos desde deleteMission", async () => {
      const error = new Error("Database error");
      error.code = 'P5000';
      mockDelete.mockRejectedValueOnce(error);

      await expect(missionServiceInstance.deleteMission(99)).rejects.toThrow("Database error");
    });

    it("Debería borrar la misión exitosamente utilizando Prisma", async () => {
      mockDelete.mockResolvedValueOnce({ id: 1 });

      const result = await missionServiceInstance.deleteMission(1);

      expect(mockDelete).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result.message).toBe("Mission deleted successfully");
    });
  });

  describe("Gestión de Ejecuciones", () => {
    it("Debería inicializar nuevo registro de ejecución en estado 'en progreso'", async () => {
      mockCreate.mockResolvedValueOnce({ id: 11, status: 'in_progress' });
      const result = await missionServiceInstance.startMissionRun(1);
      
      expect(result.status).toBe("in_progress");
      expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
        data: { missionId: 1, status: 'in_progress' }
      }));
    });
  });

  describe("Consultas Secundarias", () => {
    it("Debería resolver una lista de misiones existentes", async () => {
      mockFindMany.mockResolvedValueOnce([{ id: 1 }]);
      const result = await missionServiceInstance.getAllMissions();
      expect(result.length).toBe(1);
    });

    it("Debería resolver el historial de ejecución de una misión", async () => {
      mockFindMany.mockResolvedValueOnce([{ id: 11 }]);
      const result = await missionServiceInstance.getMissionRuns(1);
      expect(result.length).toBe(1);
      expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { missionId: 1 }
      }));
    });

    it("Debería reflejar cambios parciales en una ejecución activa", async () => {
      mockUpdate.mockResolvedValueOnce({ id: 11, status: "completed" });
      const result = await missionServiceInstance.updateMissionRun(11, { status: "completed" });
      expect(result.status).toBe("completed");
    });

    it("Debería lanzar error 404 al actualizar una ejecución inexistente", async () => {
      const error = new Error();
      error.code = 'P2025';
      mockUpdate.mockRejectedValueOnce(error);

      await expect(missionServiceInstance.updateMissionRun(99, {})).rejects.toThrow("Execution not found");
    });

    it("Debería relanzar errores desde updateMissionRun", async () => {
      const error = new Error("Database error");
      error.code = 'P5000';
      mockUpdate.mockRejectedValueOnce(error);

      await expect(missionServiceInstance.updateMissionRun(99, {})).rejects.toThrow("Database error");
    });
  });
});
