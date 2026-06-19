import { jest } from '@jest/globals';

describe("Servicio de Telemetría", () => {
  let mockFindUnique, mockFindMany;
  let RobotService;
  let robotServiceInstance;
  let fakePrisma;

  beforeEach(async () => {
    jest.resetModules();
    
    mockFindUnique = jest.fn();
    mockFindMany = jest.fn();

    fakePrisma = {
      robotState: { findUnique: mockFindUnique },
      robotData: { findMany: mockFindMany },
      energyHistory: { findMany: mockFindMany },
      missionExecution: { findFirst: jest.fn().mockResolvedValue({ startTime: new Date() }) },
      $queryRaw: jest.fn().mockResolvedValue([{ fecha_inicio: new Date() }])
    };

    const module = await import('../robotService.js');
    RobotService = module.RobotService;
    
    robotServiceInstance = new RobotService(fakePrisma);
  });

  describe("obtener estado del robot", () => {
    it("Debería lanzar error 404 si el registro maestro fue alterado o eliminado", async () => {
      mockFindUnique.mockResolvedValueOnce(null);
      await expect(robotServiceInstance.getRobotState()).rejects.toThrow("not found");
    });
  });

  describe("Construcción SQL Dinámica (Agronómica)", () => {
    it("Debería generar consulta sin WHERE si no se reciben parámetros", async () => {
      mockFindMany.mockResolvedValueOnce([]);
      await robotServiceInstance.getAgronomicData({});
      
      const args = mockFindMany.mock.calls[0][0];
      expect(args.where).toEqual({});
      expect(args.orderBy).toEqual({ timestamp: 'desc' });
    });

    it("Debería acotar la búsqueda temporal inyectando cláusulas de fecha", async () => {
      mockFindMany.mockResolvedValueOnce([]);
      await robotServiceInstance.getAgronomicData({ start: '2026-01-01', end: '2026-01-31' });
      
      const args = mockFindMany.mock.calls[0][0];
      expect(args.where.timestamp).toHaveProperty('gte');
    });

    it("Debería ignorar variable misionId si recibe string 'null'", async () => {
      mockFindMany.mockResolvedValueOnce([]);
      await robotServiceInstance.getAgronomicData({ misionId: 'null' });
      
      const args = mockFindMany.mock.calls[0][0];
      expect(args.where).not.toHaveProperty('execution');
    });
  });

  describe("Construcción SQL Dinámica (Energía)", () => {
    it("Debería resolver límites inyectando subconsultas indexadas si misionId existe", async () => {
      mockFindMany.mockResolvedValueOnce([]);
      await robotServiceInstance.getEnergyHistory({ misionId: '5' });
      
      const args = mockFindMany.mock.calls[0][0];
      expect(args.where.timestamp).toBeDefined();
    });
  });

  describe("Casos Extremos y Resolución de Datos", () => {
    it("Debería recuperar y devolver documento de estado si la conexión es exitosa", async () => {
      mockFindUnique.mockResolvedValueOnce({ systemStatus: 'activo' });
      const result = await robotServiceInstance.getRobotState();
      expect(result.systemStatus).toBe('activo');
    });

    it("Debería inyectar la cláusula relacional de misión si el ID es numérico", async () => {
      mockFindMany.mockResolvedValueOnce([]);
      await robotServiceInstance.getAgronomicData({ misionId: '5' });
      const args = mockFindMany.mock.calls[0][0];
      expect(args.where).toHaveProperty('execution.missionId', 5);
    });

    it("Debería retornar consulta base de historial si se envía objeto vacío", async () => {
      mockFindMany.mockResolvedValueOnce([]);
      await robotServiceInstance.getEnergyHistory({});
      const args = mockFindMany.mock.calls[0][0];
      expect(args.where).toEqual({});
    });

    it("Debería evaluar límites temporales válidos en historial de energía", async () => {
      mockFindMany.mockResolvedValueOnce([]);
      await robotServiceInstance.getEnergyHistory({ start: '2026-01-01', end: '2026-01-31' });
      const args = mockFindMany.mock.calls[0][0];
      expect(args.where.timestamp).toHaveProperty('gte');
    });
  });
});
