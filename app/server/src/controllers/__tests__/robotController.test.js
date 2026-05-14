// server/src/controllers/__tests__/robotController.test.js
import { jest } from '@jest/globals';

describe('Robot Controller', () => {
  let mockQuery;
  let req, res, next;
  let controller; 

  beforeEach(async () => { 
    jest.resetModules();
    mockQuery = jest.fn();
    req = { query: {}, params: {} };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();

    jest.unstable_mockModule('../../config/db.js', () => ({
      pool: { query: mockQuery },
    }));

    controller = await import('../robotController.js'); 
  });

  // 👇 HELPER MAGICO: Elimina el 0.2% de código duplicado
  const runControllerAndGetQuery = async (controllerFn, queryParams = {}) => {
    req.query = queryParams;
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await controllerFn(req, res, next);
    return mockQuery.mock.calls[0][0]; // Devuelve la query SQL que se iba a ejecutar
  };

  describe('getEstadoRobot', () => {
    it('Debe devolver 404 si el estado del robot no existe', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      await controller.getEstadoRobot(req, res, next);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('Debe devolver el estado si existe', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ bateria: 100 }] });
      await controller.getEstadoRobot(req, res, next);
      expect(res.json).toHaveBeenCalledWith({ bateria: 100 });
    });
  });

  describe('getDatosAgronomicos', () => {
    it('Debe construir la query SQL sin filtros', async () => {
      const sql = await runControllerAndGetQuery(controller.getDatosAgronomicos);
      expect(sql).not.toContain("WHERE");
    });

    it('Debe filtrar por fechas (start y end)', async () => {
      const sql = await runControllerAndGetQuery(controller.getDatosAgronomicos, { start: '2026-01-01', end: '2026-01-31' });
      expect(sql).toContain('d."timestamp" >= $1 AND d."timestamp" <= $2');
    });

    it('Debe filtrar por misionId', async () => {
      const sql = await runControllerAndGetQuery(controller.getDatosAgronomicos, { misionId: '2' });
      expect(sql).toContain("m.id = $1");
    });

    it('No debe aplicar el filtro misionId si es "null" o vacío', async () => {
      const sql = await runControllerAndGetQuery(controller.getDatosAgronomicos, { misionId: 'null' });
      expect(sql).not.toContain('m.id ='); 
    });
  });

  describe('getHistorialEnergia', () => {
    it('Debe construir la query SQL sin filtros', async () => {
      const sql = await runControllerAndGetQuery(controller.getHistorialEnergia);
      expect(sql).not.toContain("WHERE");
    });

    it('Debe filtrar por fechas (start y end)', async () => {
      const sql = await runControllerAndGetQuery(controller.getHistorialEnergia, { start: '2026-01-01', end: '2026-01-31' });
      expect(sql).toContain('"timestamp" >= $1 AND "timestamp" <= $2');
    });

    it('Debe filtrar por misionId usando la subconsulta', async () => {
      const sql = await runControllerAndGetQuery(controller.getHistorialEnergia, { misionId: '2' });
      expect(sql).toContain("SELECT fecha_inicio FROM ejecuciones_mision");
    });
  });
});
