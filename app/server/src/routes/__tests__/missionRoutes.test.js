import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';

describe("Rutas de Misiones (MissionRoutes)", () => {
  let app, mockMissionController, mockValidate;

  beforeEach(async () => {
    jest.resetModules();

    mockMissionController = {
      getMisiones: jest.fn((req, res) => res.status(200).send()),
      createMision: jest.fn((req, res) => res.status(201).send()),
      updateMision: jest.fn((req, res) => res.status(200).send()),
      deleteMision: jest.fn((req, res) => res.status(200).send()),
      getEjecuciones: jest.fn((req, res) => res.status(200).send()),
      iniciarEjecucion: jest.fn((req, res) => res.status(201).send()),
      updateEjecucion: jest.fn((req, res) => res.status(200).send()),
    };

    mockValidate = jest.fn(() => (req, res, next) => next());

    jest.unstable_mockModule('../../controllers/missionController.js', () => ({
      MissionController: jest.fn(() => mockMissionController)
    }));
    jest.unstable_mockModule('../../middlewares/validateRequest.js', () => ({
      validate: mockValidate
    }));

    const { default: missionRoutes } = await import('../missionRoutes.js');
    app = express();
    app.use(express.json());
    app.use('/missions', missionRoutes);
  });

  it("Debería enrutar el flujo CRUD de misiones aplicando validación de datos en escritura", async () => {
    await request(app).get('/missions/');
    expect(mockMissionController.getMisiones).toHaveBeenCalled();

    await request(app).post('/missions/');
    expect(mockValidate).toHaveBeenCalled();
    expect(mockMissionController.createMision).toHaveBeenCalled();

    await request(app).put('/missions/1');
    expect(mockValidate).toHaveBeenCalled();
    expect(mockMissionController.updateMision).toHaveBeenCalled();

    await request(app).delete('/missions/1');
    expect(mockMissionController.deleteMision).toHaveBeenCalled();
  });

  it("Debería enrutar correctamente las peticiones de los sub-recursos de ejecución", async () => {
    await request(app).get('/missions/1/runs');
    expect(mockMissionController.getEjecuciones).toHaveBeenCalled();

    await request(app).post('/missions/1/runs');
    expect(mockMissionController.iniciarEjecucion).toHaveBeenCalled();

    await request(app).put('/missions/runs/99');
    expect(mockValidate).toHaveBeenCalled();
    expect(mockMissionController.updateEjecucion).toHaveBeenCalled();
  });
});