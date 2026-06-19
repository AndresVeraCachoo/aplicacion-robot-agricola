import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';

describe("Rutas de Misiones", () => {
  let app, mockMissionController, mockValidate;

  beforeEach(async () => {
    jest.resetModules();

    mockMissionController = {
      getMissions: jest.fn((req, res) => res.status(200).send()),
      createMission: jest.fn((req, res) => res.status(201).send()),
      updateMission: jest.fn((req, res) => res.status(200).send()),
      deleteMission: jest.fn((req, res) => res.status(200).send()),
      getExecutions: jest.fn((req, res) => res.status(200).send()),
      startExecution: jest.fn((req, res) => res.status(201).send()),
      updateExecution: jest.fn((req, res) => res.status(200).send()),
    };

    mockValidate = jest.fn(() => (req, res, next) => next());

    jest.unstable_mockModule('../../config/db.js', () => ({
      prisma: {}
    }));
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

  it("Debería enrutar flujo CRUD de misión aplicando validación en escritura", async () => {
    await request(app).get('/missions/');
    expect(mockMissionController.getMissions).toHaveBeenCalled();

    await request(app).post('/missions/');
    expect(mockValidate).toHaveBeenCalled();
    expect(mockMissionController.createMission).toHaveBeenCalled();

    await request(app).put('/missions/1');
    expect(mockValidate).toHaveBeenCalled();
    expect(mockMissionController.updateMission).toHaveBeenCalled();

    await request(app).delete('/missions/1');
    expect(mockMissionController.deleteMission).toHaveBeenCalled();
  });

  it("Debería enrutar peticiones para sub-recursos de ejecución", async () => {
    await request(app).get('/missions/1/runs');
    expect(mockMissionController.getExecutions).toHaveBeenCalled();

    await request(app).post('/missions/1/runs');
    expect(mockMissionController.startExecution).toHaveBeenCalled();

    await request(app).put('/missions/runs/99');
    expect(mockValidate).toHaveBeenCalled();
    expect(mockMissionController.updateExecution).toHaveBeenCalled();
  });
});
