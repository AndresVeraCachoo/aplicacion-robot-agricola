// server/src/routes/__tests__/userRoutes.test.js
import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';

describe('User Routes', () => {
  let app;
  let mockAuthenticateToken, mockRequireAdmin;
  let mockGetProfile, mockGetUsers;

  beforeEach(async () => {
    jest.resetModules();

    // Mocks de middlewares (Simulamos que los guardias dejan pasar)
    mockAuthenticateToken = jest.fn((req, res, next) => next());
    mockRequireAdmin = jest.fn((req, res, next) => next());

    // Mocks de controladores (Solo necesitamos que respondan algo para saber que llegaron ahí)
    mockGetProfile = jest.fn((req, res) => res.status(200).json({ ok: true }));
    mockGetUsers = jest.fn((req, res) => res.status(200).json({ ok: true }));

    jest.unstable_mockModule('../../middlewares/auth.js', () => ({
      authenticateToken: mockAuthenticateToken,
      requireAdmin: mockRequireAdmin,
    }));

    jest.unstable_mockModule('../../controllers/userController.js', () => ({
      getProfile: mockGetProfile,
      updatePassword: jest.fn(),
      updateAvatar: jest.fn(),
      getUsers: mockGetUsers,
      createUser: jest.fn(),
      updateUser: jest.fn(),
      deleteUser: jest.fn(),
    }));

    const { default: userRoutes } = await import('../userRoutes.js');
    app = express();
    app.use(express.json());
    app.use('/users', userRoutes);
  });

  it('Debe proteger TODAS las rutas inyectando authenticateToken globalmente (GET /profile)', async () => {
    await request(app).get('/users/profile');
    
    // Verificamos que el router.use(authenticateToken) está funcionando
    expect(mockAuthenticateToken).toHaveBeenCalledTimes(1);
    expect(mockGetProfile).toHaveBeenCalledTimes(1);
  });

  it('Debe inyectar requireAdmin en las rutas de administración (GET /)', async () => {
    await request(app).get('/users/');

    // Verificamos la cadena de montaje: Primero se autentica, luego se pide admin, luego controlador
    expect(mockAuthenticateToken).toHaveBeenCalledTimes(1);
    expect(mockRequireAdmin).toHaveBeenCalledTimes(1);
    expect(mockGetUsers).toHaveBeenCalledTimes(1);
  });
});