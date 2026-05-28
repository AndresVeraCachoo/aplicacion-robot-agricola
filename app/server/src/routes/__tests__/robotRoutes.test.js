// server/src/routes/__tests__/robotRoutes.test.js
import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';

describe("🌐 Rutas del Robot (RobotRoutes)", () => {
  let app, mockRobotController, mockAuthenticateToken, mockValidate;

  beforeEach(async () => {
    jest.resetModules();

    mockRobotController = {
      getEstadoRobot: jest.fn((req, res) => res.status(200).send()),
      getDatosAgronomicos: jest.fn((req, res) => res.status(200).send()),
      getHistorialEnergia: jest.fn((req, res) => res.status(200).send()),
    };

    mockAuthenticateToken = jest.fn((req, res, next) => next());
    mockValidate = jest.fn(() => (req, res, next) => next());

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

  it("✅ GET /robot/estado: Se autentica y llega al controlador", async () => {
    await request(app).get('/robot/estado');
    expect(mockAuthenticateToken).toHaveBeenCalled();
    expect(mockRobotController.getEstadoRobot).toHaveBeenCalled();
  });

  it("✅ Rutas de datos: Valida Zod y llega al controlador", async () => {
    await request(app).get('/robot/datos');
    expect(mockValidate).toHaveBeenCalled();
    expect(mockRobotController.getDatosAgronomicos).toHaveBeenCalled();

    await request(app).get('/robot/energia/historial');
    expect(mockValidate).toHaveBeenCalled();
    expect(mockRobotController.getHistorialEnergia).toHaveBeenCalled();
  });
});