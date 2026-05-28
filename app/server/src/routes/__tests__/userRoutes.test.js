// server/src/routes/__tests__/userRoutes.test.js
import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';

describe("🌐 Rutas de Usuarios (UserRoutes)", () => {
  let app, mockUserController, mockAuthenticateToken, mockRequireAdmin, mockValidate;

  beforeEach(async () => {
    jest.resetModules();

    mockUserController = {
      getProfile: jest.fn((req, res) => res.status(200).send()),
      updatePassword: jest.fn((req, res) => res.status(200).send()),
      updateAvatar: jest.fn((req, res) => res.status(200).send()),
      getUsers: jest.fn((req, res) => res.status(200).send()),
      createUser: jest.fn((req, res) => res.status(201).send()),
      updateUser: jest.fn((req, res) => res.status(200).send()),
      deleteUser: jest.fn((req, res) => res.status(200).send()),
    };

    mockAuthenticateToken = jest.fn((req, res, next) => next());
    mockRequireAdmin = jest.fn((req, res, next) => next());
    mockValidate = jest.fn(() => (req, res, next) => next());

    jest.unstable_mockModule('../../controllers/userController.js', () => ({
      UserController: jest.fn(() => mockUserController)
    }));
    jest.unstable_mockModule('../../middlewares/auth.js', () => ({
      authenticateToken: mockAuthenticateToken, requireAdmin: mockRequireAdmin
    }));
    jest.unstable_mockModule('../../middlewares/validateRequest.js', () => ({
      validate: mockValidate
    }));

    const { default: userRoutes } = await import('../userRoutes.js');
    app = express();
    app.use(express.json());
    app.use('/users', userRoutes);
  });

  it("🛡️ Protege todas las rutas con authenticateToken", async () => {
    await request(app).get('/users/profile');
    expect(mockAuthenticateToken).toHaveBeenCalled();
    expect(mockUserController.getProfile).toHaveBeenCalled();
  });

  it("🛡️ Aplica requireAdmin y validate al crear un usuario", async () => {
    await request(app).post('/users/').send({});
    expect(mockRequireAdmin).toHaveBeenCalled();
    expect(mockValidate).toHaveBeenCalled();
    expect(mockUserController.createUser).toHaveBeenCalled();
  });

  it("✅ Enruta las acciones CRUD a sus métodos correspondientes", async () => {
    await request(app).get('/users/');
    expect(mockUserController.getUsers).toHaveBeenCalled();
    
    await request(app).put('/users/1');
    expect(mockUserController.updateUser).toHaveBeenCalled();
    
    await request(app).delete('/users/1');
    expect(mockUserController.deleteUser).toHaveBeenCalled();
  });
});