import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';

describe("Rutas de Autenticación", () => {
  let app, mockAuthController, mockAuthenticateToken, mockValidate;

  beforeEach(async () => {
    jest.resetModules();

    jest.unstable_mockModule('../../config/env.js', () => ({
      env: { JWT_SECRET: 'test-secret' }
    }));
    jest.unstable_mockModule('../../config/db.js', () => ({
      prisma: {}
    }));

    mockAuthController = {
      login: jest.fn((req, res) => res.status(200).json({ ok: true })),
      logout: jest.fn((req, res) => res.status(200).json({ ok: true })),
      verify: jest.fn((req, res) => res.status(200).json({ ok: true })),
    };
    mockAuthenticateToken = jest.fn((req, res, next) => next());
    mockValidate = jest.fn(() => (req, res, next) => next());

    jest.unstable_mockModule('../../controllers/authController.js', () => ({
      AuthController: jest.fn(() => mockAuthController)
    }));
    jest.unstable_mockModule('../../middlewares/auth.js', () => ({
      authenticateToken: mockAuthenticateToken
    }));
    jest.unstable_mockModule('../../middlewares/validateRequest.js', () => ({
      validate: mockValidate
    }));

    const { default: authRoutes } = await import('../authRoutes.js');
    app = express();
    app.use(express.json());
    app.use('/auth', authRoutes);
  });

  it("Debería validar petición y alcanzar controlador en endpoint de login", async () => {
    await request(app).post('/auth/login').send({});
    expect(mockValidate).toHaveBeenCalled();
    expect(mockAuthController.login).toHaveBeenCalled();
  });

  it("Debería autenticar token y alcanzar controlador de verificación", async () => {
    await request(app).get('/auth/verify');
    expect(mockAuthenticateToken).toHaveBeenCalled();
    expect(mockAuthController.verify).toHaveBeenCalled();
  });

  it("Debería llamar a logout en endpoint de logout", async () => {
    await request(app).post('/auth/logout');
    expect(mockAuthController.logout).toHaveBeenCalled();
  });
});
