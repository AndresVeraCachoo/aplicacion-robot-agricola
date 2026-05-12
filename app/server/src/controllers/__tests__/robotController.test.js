// server/src/controllers/__tests__/robotController.test.js
import { jest } from '@jest/globals';

describe('Robot Controller', () => {
  let mockQuery;
  let req, res, next;
  let controller; // Declaramos la variable global para los tests

  beforeEach(async () => { // Hacemos el beforeEach asíncrono
    jest.resetModules();
    mockQuery = jest.fn();
    req = { query: {}, params: {} };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();

    jest.unstable_mockModule('../../config/db.js', () => ({
      pool: { query: mockQuery },
    }));

    // Importamos el controlador UNA SOLA VEZ para todos los tests
    controller = await import('../robotController.js'); 
  });

  describe('getEstadoRobot', () => {
    it('Debe devolver 404 si el estado del robot no existe', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await controller.getEstadoRobot(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "Estado del robot no encontrado" });
    });

    it('Debe devolver el estado si existe', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ bateria: 100 }] });

      await controller.getEstadoRobot(req, res, next);

      expect(res.json).toHaveBeenCalledWith({ bateria: 100 });
    });
  });

  describe('getDatosAgronomicos', () => {
    it('Debe construir la query SQL sin filtros', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      await controller.getDatosAgronomicos(req, res, next);

      const calledQuery = mockQuery.mock.calls[0][0];
      expect(calledQuery).not.toContain("WHERE");
    });

    it('Debe filtrar por fechas (start y end)', async () => {
      req.query = { start: '2026-01-01', end: '2026-01-31' };
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await controller.getDatosAgronomicos(req, res, next);

      const calledQuery = mockQuery.mock.calls[0][0];
      expect(calledQuery).toContain('d."timestamp" >= $1 AND d."timestamp" <= $2');
    });

    it('Debe filtrar por misionId', async () => {
      req.query = { misionId: '2' };
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await controller.getDatosAgronomicos(req, res, next);

      const calledQuery = mockQuery.mock.calls[0][0];
      expect(calledQuery).toContain("m.id = $1");
    });

    it('No debe aplicar el filtro misionId si es "null" o vacío', async () => {
      req.query = { misionId: 'null' };
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await controller.getDatosAgronomicos(req, res, next);

      const calledQuery = mockQuery.mock.calls[0][0];
      expect(calledQuery).not.toContain('m.id ='); 
    });
  });

  describe('getHistorialEnergia', () => {
    it('Debe construir la query SQL sin filtros', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      await controller.getHistorialEnergia(req, res, next);

      const calledQuery = mockQuery.mock.calls[0][0];
      expect(calledQuery).not.toContain("WHERE");
    });

    it('Debe filtrar por fechas (start y end)', async () => {
      req.query = { start: '2026-01-01', end: '2026-01-31' };
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await controller.getHistorialEnergia(req, res, next);

      const calledQuery = mockQuery.mock.calls[0][0];
      expect(calledQuery).toContain('"timestamp" >= $1 AND "timestamp" <= $2');
    });

    it('Debe filtrar por misionId usando la subconsulta', async () => {
      req.query = { misionId: '2' };
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await controller.getHistorialEnergia(req, res, next);

      const calledQuery = mockQuery.mock.calls[0][0];
      expect(calledQuery).toContain("SELECT fecha_inicio FROM ejecuciones_mision");
    });
  });
});