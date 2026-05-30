import { jest } from '@jest/globals';

describe("Servicio de Telemetría (RobotService)", () => {
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
    it("Debería arrojar error 404 si el registro maestro del estado ha sido alterado o borrado", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      await expect(robotServiceInstance.getRobotState()).rejects.toThrow("no encontrado");
    });
  });

  describe("Construcción Dinámica SQL (Agronomic Data)", () => {
    it("Debería generar una consulta base sin predicados WHERE al no recibir parámetros", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      await robotServiceInstance.getAgronomicData({});
      
      const sql = mockQuery.mock.calls[0][0];
      expect(sql).not.toContain("WHERE");
      expect(sql).toContain("ORDER BY");
    });

    it("Debería acotar temporalmente la búsqueda inyectando cláusulas de fechas", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      await robotServiceInstance.getAgronomicData({ start: '2026-01-01', end: '2026-01-31' });
      
      const sql = mockQuery.mock.calls[0][0];
      expect(sql).toContain("WHERE d.\"timestamp\" >= $1");
    });

    it("Debería ignorar la variable misionId de forma segura si recibe un string 'null' emitido por Axios", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      await robotServiceInstance.getAgronomicData({ misionId: 'null' });
      
      const sql = mockQuery.mock.calls[0][0];
      expect(sql).not.toContain("WHERE m.id =");
    });
  });

  describe("Construcción Dinámica SQL (Energy History)", () => {
    it("Debería resolver límites de memoria inyectando subconsultas indexadas si se especifica misionId", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      await robotServiceInstance.getEnergyHistory({ misionId: '5' });
      
      const sql = mockQuery.mock.calls[0][0];
      expect(sql).toContain("SELECT fecha_inicio FROM ejecuciones_mision WHERE mision_id = $1");
      expect(sql).toContain("LIMIT 1"); 
    });
  });

  describe("Casos Límite y Resolución de Datos", () => {
    it("Debería recuperar y retornar el documento de estado si la conexión es exitosa", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ system_status: 'activo' }] });
      const result = await robotServiceInstance.getRobotState();
      expect(result.system_status).toBe('activo');
    });

    it("Debería inyectar la cláusula relacional de misión en la búsqueda si el ID es numérico", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      await robotServiceInstance.getAgronomicData({ misionId: '5' });
      const sql = mockQuery.mock.calls[0][0];
      expect(sql).toContain("m.id =");
    });

    it("Debería devolver la consulta base de historial sin acotar rangos si se envía objeto vacío", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      await robotServiceInstance.getEnergyHistory({});
      const sql = mockQuery.mock.calls[0][0];
      expect(sql).not.toContain("WHERE");
    });

    it("Debería evaluar límites temporales válidos en el historial energético", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      await robotServiceInstance.getEnergyHistory({ start: '2026-01-01', end: '2026-01-31' });
      const sql = mockQuery.mock.calls[0][0];
      expect(sql).toContain("timestamp\" >=");
    });
  });
});