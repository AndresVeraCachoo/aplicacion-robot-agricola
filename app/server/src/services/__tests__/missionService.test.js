// server/src/services/__tests__/missionService.test.js
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
    it("✅ Debería crear una misión parseando los objetos a JSON string", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, nombre: 'Nueva' }] });

      const payload = {
        nombre: 'Nueva', area_trabajo: { type: 'Polygon' } // Objeto
      };

      await missionServiceInstance.createMission(payload);
      
      const calledArgs = mockQuery.mock.calls[0][1];
      expect(calledArgs[5]).toBe(JSON.stringify({ type: 'Polygon' }));
    });

    it("✅ Debería crear una misión dejando intactos los campos si ya son Strings (Branch testing)", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 2 }] });

      const payload = {
        nombre: 'Cruda', 
        area_trabajo: 'POLYGON()', 
        puntos_interes: 'POINT()', 
        punto_retorno: 'POINT()'
      };

      await missionServiceInstance.createMission(payload);
      
      // Comprobamos que el operador ternario detectó que no eran objetos y los dejó igual
      const calledArgs = mockQuery.mock.calls[0][1];
      expect(calledArgs[5]).toBe('POLYGON()');
      expect(calledArgs[6]).toBe('POINT()');
    });

    it("✅ Debería actualizar una misión correctamente devolviendo sus datos", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, nombre: 'Actualizada' }] });
      
      // Esto cubre la famosa línea 64 que estaba sin testear
      const result = await missionServiceInstance.updateMission(1, { nombre: 'Actualizada' });
      
      expect(result.nombre).toBe('Actualizada');
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("UPDATE misiones"), expect.any(Array));
    });

    it("❌ Debería fallar (404) si intenta actualizar una misión que no existe", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      await expect(missionServiceInstance.updateMission(99, {})).rejects.toThrow("Misión no encontrada");
    });
  });

  describe("Transacción: deleteMission", () => {
    it("❌ Transacción: Debería hacer ROLLBACK si la misión no existe", async () => {
      mockClientQuery
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [] }); // Misión no encontrada

      await expect(missionServiceInstance.deleteMission(99)).rejects.toThrow("Misión no encontrada");
      
      expect(mockClientQuery).toHaveBeenCalledWith("ROLLBACK");
      expect(mockClientRelease).toHaveBeenCalled();
    });

    it("✅ Transacción: Debería borrar en cascada y hacer COMMIT", async () => {
      mockClientQuery
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // check
        .mockResolvedValueOnce(undefined) // delete ejecuciones
        .mockResolvedValueOnce(undefined); // delete mision

      await missionServiceInstance.deleteMission(1);

      expect(mockClientQuery).toHaveBeenCalledWith("DELETE FROM ejecuciones_mision WHERE mision_id = $1", [1]);
      expect(mockClientQuery).toHaveBeenCalledWith("COMMIT");
      expect(mockClientRelease).toHaveBeenCalled();
    });
  });

  describe("Gestión de Ejecuciones (Runs)", () => {
    it("✅ Debería iniciar una ejecución en estado 'en_curso'", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 11, estado: 'en_curso' }] });
      const result = await missionServiceInstance.startMissionRun(1);
      
      expect(result.estado).toBe("en_curso");
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO ejecuciones_mision"), [1]);
    });
  });

  describe("🔄 Consultas y Actualizaciones Secundarias (Missions)", () => {
    it("✅ Debería devolver todas las misiones", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });
      const result = await missionServiceInstance.getAllMissions();
      expect(result.length).toBe(1);
    });

    it("✅ Debería devolver las ejecuciones de una misión", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 11 }] });
      const result = await missionServiceInstance.getMissionRuns(1);
      expect(result.length).toBe(1);
    });

    it("✅ Debería actualizar una ejecución existente", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 11, estado: "completado" }] });
      const result = await missionServiceInstance.updateMissionRun(11, { estado: "completado" });
      expect(result.estado).toBe("completado");
    });

    it("❌ Debería fallar (404) al actualizar una ejecución inexistente", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      await expect(missionServiceInstance.updateMissionRun(99, {})).rejects.toThrow("Ejecución no encontrada");
    });
  });
});