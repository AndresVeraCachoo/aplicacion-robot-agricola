// server/src/routes/__tests__/missionRoutes.test.js
import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';

describe('Mission Routes', () => {
  let app;
  let mocks;

  beforeEach(async () => {
    jest.resetModules();

    // Preparamos un objeto con todos los mocks de los controladores
    mocks = {
      getMisiones: jest.fn((req, res) => res.status(200).send()),
      createMision: jest.fn((req, res) => res.status(201).send()),
      updateMision: jest.fn((req, res) => res.status(200).send()),
      deleteMision: jest.fn((req, res) => res.status(200).send()),
      getEjecuciones: jest.fn((req, res) => res.status(200).send()),
      iniciarEjecucion: jest.fn((req, res) => res.status(201).send()),
      updateEjecucion: jest.fn((req, res) => res.status(200).send()),
    };

    jest.unstable_mockModule('../../controllers/missionController.js', () => mocks);

    const { default: missionRoutes } = await import('../missionRoutes.js');
    app = express();
    app.use(express.json());
    app.use('/missions', missionRoutes);
  });

  it('Debe enrutar el CRUD básico de misiones a sus controladores', async () => {
    await request(app).get('/missions/');
    expect(mocks.getMisiones).toHaveBeenCalled();

    await request(app).post('/missions/').send({ nombre: 'Test' });
    expect(mocks.createMision).toHaveBeenCalled();

    await request(app).put('/missions/1').send({ nombre: 'Update' });
    expect(mocks.updateMision).toHaveBeenCalled();

    await request(app).delete('/missions/1');
    expect(mocks.deleteMision).toHaveBeenCalled();
  });

  it('Debe enrutar los endpoints de ejecuciones a sus controladores', async () => {
    await request(app).get('/missions/1/runs');
    expect(mocks.getEjecuciones).toHaveBeenCalled();

    await request(app).post('/missions/1/runs');
    expect(mocks.iniciarEjecucion).toHaveBeenCalled();

    await request(app).put('/missions/runs/99');
    expect(mocks.updateEjecucion).toHaveBeenCalled();
  });
});