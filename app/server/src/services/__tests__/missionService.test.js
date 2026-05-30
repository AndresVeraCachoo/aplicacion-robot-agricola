import { jest } from '@jest/globals';

describe("Servicio de Misiones (MissionService)", () => {
  let mockQuery, mockConnect, mockClientQuery, mockClientRelease;
  let MissionService;
  let missionServiceInstance;

  beforeEach(async () => {
    jest.resetModules();

    mockQuery = jest.fn();
    mockClientQuery = jest.fn();
    mockClientRelease = jest.fn();
    mockConnect = jest.fn().mockResolvedValue({ query: mockClientQuery, release: mockClientRelease });

    const module = await import('../missionService.js');
    MissionService = module.MissionService;
    
    const fakePool = { query: mockQuery, connect: mockConnect };
    missionServiceInstance = new MissionService(fakePool);
  });

  describe("createMission & updateMission", () => {
    it("Debería crear una misión serializando objetos complejos a string JSON", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, nombre: 'Nueva' }] });

      const payload = {
        nombre: 'Nueva', area_trabajo: { type: 'Polygon' } 
      };

      await missionServiceInstance.createMission(payload);
      
      const calledArgs = mockQuery.mock.calls[0][1];
      expect(calledArgs[5]).toBe(JSON.stringify({ type: 'Polygon' }));
    });

    it("Debería omitir la serialización si los campos estructurales ya son strings", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 2 }] });

      const payload = {
        nombre: 'Cruda', 
        area_trabajo: 'POLYGON()', 
        puntos_interes: 'POINT()', 
        punto_retorno: 'POINT()'
      };

      await missionServiceInstance.createMission(payload);
      
      const calledArgs = mockQuery.mock.calls[0][1];
      expect(calledArgs[5]).toBe('POLYGON()');
      expect(calledArgs[6]).toBe('POINT()');
    });

    it("Debería realizar una actualización parcial y devolver la entidad mutada", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, nombre: 'Actualizada' }] });
      
      const result = await missionServiceInstance.updateMission(1, { nombre: 'Actualizada' });
      
      expect(result.nombre).toBe('Actualizada');
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("UPDATE misiones"), expect.any(Array));
    });

    it("Debería lanzar error 404 al intentar actualizar un registro inexistente", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      await expect(missionServiceInstance.updateMission(99, {})).rejects.toThrow("Misión no encontrada");
    });
  });

  describe("Transacción: deleteMission", () => {
    it("Debería abortar la transacción (ROLLBACK) si la misión requerida no existe", async () => {
      mockClientQuery
        .mockResolvedValueOnce(undefined) 
        .mockResolvedValueOnce({ rows: [] }); 

      await expect(missionServiceInstance.deleteMission(99)).rejects.toThrow("Misión no encontrada");
      
      expect(mockClientQuery).toHaveBeenCalledWith("ROLLBACK");
      expect(mockClientRelease).toHaveBeenCalled();
    });

    it("Debería eliminar entidades hijas en cascada y aplicar COMMIT exitoso", async () => {
      mockClientQuery
        .mockResolvedValueOnce(undefined) 
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) 
        .mockResolvedValueOnce(undefined) 
        .mockResolvedValueOnce(undefined); 

      await missionServiceInstance.deleteMission(1);

      expect(mockClientQuery).toHaveBeenCalledWith("DELETE FROM ejecuciones_mision WHERE mision_id = $1", [1]);
      expect(mockClientQuery).toHaveBeenCalledWith("COMMIT");
      expect(mockClientRelease).toHaveBeenCalled();
    });
  });

  describe("Gestión de Ejecuciones (Runs)", () => {
    it("Debería inicializar un nuevo registro de ejecución en estado 'en_curso'", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 11, estado: 'en_curso' }] });
      const result = await missionServiceInstance.startMissionRun(1);
      
      expect(result.estado).toBe("en_curso");
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO ejecuciones_mision"), [1]);
    });
  });

  describe("Consultas Secundarias", () => {
    it("Debería resolver una lista de misiones existentes", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });
      const result = await missionServiceInstance.getAllMissions();
      expect(result.length).toBe(1);
    });

    it("Debería resolver el historial de ejecuciones de una misión dada", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 11 }] });
      const result = await missionServiceInstance.getMissionRuns(1);
      expect(result.length).toBe(1);
    });

    it("Debería reflejar cambios parciales en una ejecución activa", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 11, estado: "completado" }] });
      const result = await missionServiceInstance.updateMissionRun(11, { estado: "completado" });
      expect(result.estado).toBe("completado");
    });

    it("Debería lanzar error 404 al enviar actualizaciones a una ejecución inexistente", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      await expect(missionServiceInstance.updateMissionRun(99, {})).rejects.toThrow("Ejecución no encontrada");
    });
  });
});