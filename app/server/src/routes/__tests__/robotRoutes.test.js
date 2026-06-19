import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';

describe("Rutas de Robot", () => {
  let app, mockRobotController, mockAuthenticateToken, mockValidate;

  beforeEach(async () => {
    jest.resetModules();

    mockRobotController = {
      getRobotState: jest.fn((req, res) => res.status(200).send()),
      getAgronomicData: jest.fn((req, res) => res.status(200).send()),
      getEnergyHistory: jest.fn((req, res) => res.status(200).send()),
    };

    mockAuthenticateToken = jest.fn((req, res, next) => next());
    mockValidate = jest.fn(() => (req, res, next) => next());

    jest.unstable_mockModule('../../config/db.js', () => ({
      prisma: {}
    }));
    jest.unstable_mockModule('../../controllers/robotController.js', () => ({
      RobotController: jest.fn(() => mockRobotController)
    }));
    jest.unstable_mockModule('../../middlewares/auth.js', () => ({
      authenticateToken: mockAuthenticateToken
    }));
    jest.unstable_mockModule('../../middlewares/validateRequest.js', () => ({
      validate: mockValidate
    }));

    const { default: robotRoutes } = await import('../robotRoutes.js');
    app = express();
    app.use(express.json());
    app.use('/robot', robotRoutes);
  });

  it("Debería autenticar petición y alcanzar controlador de estado de robot", async () => {
    await request(app).get('/robot/estado');
    expect(mockAuthenticateToken).toHaveBeenCalled();
    expect(mockRobotController.getRobotState).toHaveBeenCalled();
  });

  it("Debería validar consulta y enrutar a controladores de historial", async () => {
    await request(app).get('/robot/datos');
    expect(mockValidate).toHaveBeenCalled();
    expect(mockRobotController.getAgronomicData).toHaveBeenCalled();

    await request(app).get('/robot/energia/historial');
    expect(mockValidate).toHaveBeenCalled();
    expect(mockRobotController.getEnergyHistory).toHaveBeenCalled();
  });
});
