// server/src/controllers/__tests__/missionController.test.js
import { jest } from '@jest/globals';

describe('Mission Controller', () => {
  let mockQuery;
  let req, res, next;

  beforeEach(() => {
    jest.resetModules();
    mockQuery = jest.fn();
    
    // Mocks de Express
    req = { params: {}, body: {} };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();

    // Inyección de dependencias
    jest.unstable_mockModule('../../config/db.js', () => ({
      pool: { query: mockQuery },
    }));
  });

  describe('getMisiones & createMision', () => {
    it('getMisiones debe devolver la lista de misiones', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, nombre: 'Alfa' }] });

      const { getMisiones } = await import('../missionController.js');
      await getMisiones(req, res, next);

      expect(mockQuery).toHaveBeenCalledWith("SELECT * FROM misiones ORDER BY fecha_creacion DESC");
      expect(res.json).toHaveBeenCalledWith([{ id: 1, nombre: 'Alfa' }]);
    });

    it('createMision debe insertar y devolver la misión creada', async () => {
      req.body = { 
        nombre: 'Nueva', tipo_tarea: 'siembra', ancho_trabajo: 2, 
        angulo_pasada: 90, bateria_minima: 20, area_trabajo: '{}', 
        puntos_interes: '[]', punto_retorno: '{}', fecha_programada: null 
      };
      
      const misionSimulada = { id: 5, nombre: 'Nueva' };
      mockQuery.mockResolvedValueOnce({ rows: [misionSimulada] });

      const { createMision } = await import('../missionController.js');
      await createMision(req, res, next);

      expect(mockQuery).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(misionSimulada);
    });
  });

  describe('updateMision & deleteMision', () => {
    it('updateMision debe devolver 404 si la misión no existe', async () => {
      req.params.id = 999;
      req.body = { nombre: 'Cambio' };
      mockQuery.mockResolvedValueOnce({ rows: [] }); // UPDATE no tocó ninguna fila

      const { updateMision } = await import('../missionController.js');
      await updateMision(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "Misión no encontrada" });
    });

    it('updateMision debe actualizar si existe', async () => {
      req.params.id = 1;
      req.body = { nombre: 'Cambio' };
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, nombre: 'Cambio' }] });

      const { updateMision } = await import('../missionController.js');
      await updateMision(req, res, next);

      expect(mockQuery).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ id: 1, nombre: 'Cambio' });
    });

    it('deleteMision debe borrar la misión', async () => {
      req.params.id = 1;

      const { deleteMision } = await import('../missionController.js');
      await deleteMision(req, res, next);

      expect(mockQuery).toHaveBeenCalledWith("DELETE FROM misiones WHERE id = $1", [1]);
      expect(res.json).toHaveBeenCalledWith({ message: "Misión eliminada correctamente" });
    });
  });

  describe('Ejecuciones (get, iniciar, update)', () => {
    it('getEjecuciones debe devolver el historial de una misión', async () => {
      req.params.id = 1;
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 10, estado: 'completado' }] });

      const { getEjecuciones } = await import('../missionController.js');
      await getEjecuciones(req, res, next);

      expect(mockQuery).toHaveBeenCalledWith(
        "SELECT * FROM ejecuciones_mision WHERE mision_id = $1 ORDER BY fecha_inicio DESC", 
        [1]
      );
      expect(res.json).toHaveBeenCalledWith([{ id: 10, estado: 'completado' }]);
    });

    it('iniciarEjecucion debe crear un registro "en_curso"', async () => {
      req.params.id = 1;
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 11, estado: 'en_curso' }] });

      const { iniciarEjecucion } = await import('../missionController.js');
      await iniciarEjecucion(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ id: 11, estado: 'en_curso' });
    });

    it('updateEjecucion debe actualizar los datos telemétricos', async () => {
      req.params.run_id = 11;
      req.body = { estado: 'completado', progreso: 100 };
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 11, estado: 'completado', progreso: 100 }] });

      const { updateEjecucion } = await import('../missionController.js');
      await updateEjecucion(req, res, next);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE ejecuciones_mision'),
        expect.any(Array)
      );
      expect(res.json).toHaveBeenCalledWith({ id: 11, estado: 'completado', progreso: 100 });
    });
  });
});