// server/src/controllers/__tests__/robotController.test.js
import { jest } from '@jest/globals';

describe('Robot Controller', () => {
  let mockQuery;
  let req, res, next;

  beforeEach(() => {
    jest.resetModules();
    mockQuery = jest.fn();
    req = { query: {}, params: {} };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();

    jest.unstable_mockModule('../../config/db.js', () => ({
      pool: { query: mockQuery },
    }));
  });

  describe('getEstadoRobot', () => {
    it('Debe devolver 404 si el estado del robot no existe', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const { getEstadoRobot } = await import('../robotController.js');
      await getEstadoRobot(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "Estado del robot no encontrado" });
    });

    it('Debe devolver el estado si existe', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ bateria: 100 }] });

      const { getEstadoRobot } = await import('../robotController.js');
      await getEstadoRobot(req, res, next);

      expect(res.json).toHaveBeenCalledWith({ bateria: 100 });
    });
  });

  describe('getDatosAgronomicos', () => {
    it('Debe construir la query SQL sin filtros', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ ph: 7 }] });
      const { getDatosAgronomicos } = await import('../robotController.js');
      await getDatosAgronomicos(req, res, next);

      const calledQuery = mockQuery.mock.calls[0][0];
      // Si no hay filtros, no debe haber un WHERE que filtre por m.id ni fechas
      expect(calledQuery).not.toContain("m.id = $1");
    });

    it('Debe inyectar la cláusula WHERE si se mandan fechas (start y end)', async () => {
      req.query = { start: '2026-01-01', end: '2026-01-31' };
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const { getDatosAgronomicos } = await import('../robotController.js');
      await getDatosAgronomicos(req, res, next);

      const calledQuery = mockQuery.mock.calls[0][0];
      // Corrección: Tu código usa comillas dobles para "timestamp"
      expect(calledQuery).toContain('d."timestamp" >= $1 AND d."timestamp" <= $2');
    });

    it('Debe inyectar la cláusula WHERE si se manda misionId', async () => {
      req.query = { misionId: '5' };
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const { getDatosAgronomicos } = await import('../robotController.js');
      await getDatosAgronomicos(req, res, next);

      const calledQuery = mockQuery.mock.calls[0][0];
      // Corrección: Tu código usa m.id = $1 por el JOIN
      expect(calledQuery).toContain('m.id = $1');
    });

    it('No debe filtrar por misionId si el valor es el string "null"', async () => {
      req.query = { misionId: 'null' }; 
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const { getDatosAgronomicos } = await import('../robotController.js');
      await getDatosAgronomicos(req, res, next);

      const calledQuery = mockQuery.mock.calls[0][0];
      // Verificamos que el filtro m.id = no se ha inyectado
      expect(calledQuery).not.toContain('m.id ='); 
    });
  });

  describe('getHistorialEnergia', () => {
    it('Debe construir la query SQL sin filtros', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const { getHistorialEnergia } = await import('../robotController.js');
      await getHistorialEnergia(req, res, next);

      const calledQuery = mockQuery.mock.calls[0][0];
      expect(calledQuery).not.toContain("WHERE");
    });

    it('Debe filtrar por fechas (start y end)', async () => {
      req.query = { start: '2026-01-01', end: '2026-01-31' };
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const { getHistorialEnergia } = await import('../robotController.js');
      await getHistorialEnergia(req, res, next);

      const calledQuery = mockQuery.mock.calls[0][0];
      // Corrección: Añadidas las comillas dobles para "timestamp"
      expect(calledQuery).toContain('"timestamp" >= $1 AND "timestamp" <= $2');
    });

    it('Debe filtrar por misionId', async () => {
      req.query = { misionId: '10' };
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const { getHistorialEnergia } = await import('../robotController.js');
      await getHistorialEnergia(req, res, next);

      const calledQuery = mockQuery.mock.calls[0][0];
      expect(calledQuery).toContain('mision_id = $1');
    });
  });
});