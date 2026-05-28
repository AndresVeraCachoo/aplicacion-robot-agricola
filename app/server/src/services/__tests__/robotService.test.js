// server/src/services/__tests__/robotService.test.js
import { jest } from '@jest/globals';

describe("🤖 Servicio de Telemetría (RobotService)", () => {
  let mockQuery;
  let RobotService;
  let robotServiceInstance;

  beforeEach(async () => {
    jest.resetModules();
    mockQuery = jest.fn();

    const module = await import('../robotService.js');
    RobotService = module.RobotService;
    
    robotServiceInstance = new RobotService({ query: mockQuery });
  });

  describe("getRobotState", () => {
    it("❌ Debería fallar (404) si el estado maestro (id=1) fue borrado", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      await expect(robotServiceInstance.getRobotState()).rejects.toThrow("no encontrado");
    });
  });

  describe("getAgronomicData (SQL Dinámico)", () => {
    it("✅ Debería construir la query básica sin filtros", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      await robotServiceInstance.getAgronomicData({});
      
      const sql = mockQuery.mock.calls[0][0];
      expect(sql).not.toContain("WHERE");
      expect(sql).toContain("ORDER BY");
    });

    it("✅ Debería añadir la cláusula WHERE si se envían fechas", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      await robotServiceInstance.getAgronomicData({ start: '2026-01-01', end: '2026-01-31' });
      
      const sql = mockQuery.mock.calls[0][0];
      expect(sql).toContain("WHERE d.\"timestamp\" >= $1");
    });

    it("✅ Debería ignorar el misionId si llega la palabra string 'null' del frontend", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      await robotServiceInstance.getAgronomicData({ misionId: 'null' });
      
      const sql = mockQuery.mock.calls[0][0];
      expect(sql).not.toContain("WHERE m.id =");
    });
  });

  describe("getEnergyHistory (SQL Dinámico con Subconsultas)", () => {
    it("✅ Debería inyectar las subconsultas complejas si se busca por misionId", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      await robotServiceInstance.getEnergyHistory({ misionId: '5' });
      
      const sql = mockQuery.mock.calls[0][0];
      expect(sql).toContain("SELECT fecha_inicio FROM ejecuciones_mision WHERE mision_id = $1");
      expect(sql).toContain("LIMIT 1"); // Aseguramos que usa el LIMIT para proteger la RAM
    });
  });

  describe("🔄 Casos Límite y Éxitos de SQL Dinámico", () => {
    it("✅ Debería devolver el estado del robot si existe (100% Branch)", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ system_status: 'activo' }] });
      const result = await robotServiceInstance.getRobotState();
      expect(result.system_status).toBe('activo');
    });

    it("✅ Debería añadir filtro de misionId si es un número válido", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      await robotServiceInstance.getAgronomicData({ misionId: '5' });
      const sql = mockQuery.mock.calls[0][0];
      expect(sql).toContain("m.id =");
    });

    it("✅ Debería construir la query básica de energía sin filtros", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      await robotServiceInstance.getEnergyHistory({});
      const sql = mockQuery.mock.calls[0][0];
      expect(sql).not.toContain("WHERE");
    });

    it("✅ Debería filtrar energía por fechas (start y end)", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      await robotServiceInstance.getEnergyHistory({ start: '2026-01-01', end: '2026-01-31' });
      const sql = mockQuery.mock.calls[0][0];
      expect(sql).toContain("timestamp\" >=");
    });
  });
});