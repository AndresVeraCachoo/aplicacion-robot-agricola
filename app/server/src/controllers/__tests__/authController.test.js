// server/src/controllers/__tests__/authController.test.js
import { jest } from '@jest/globals';

describe('Auth Controller', () => {
  let mockQuery, mockBcryptCompare, mockJwtSign;
  let req, res, next;

  beforeEach(() => {
    jest.resetModules();

    mockQuery = jest.fn();
    mockBcryptCompare = jest.fn();
    mockJwtSign = jest.fn();

    req = { body: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();

    jest.unstable_mockModule('../../config/db.js', () => ({
      pool: { query: mockQuery },
    }));
    jest.unstable_mockModule('bcrypt', () => ({
      default: { compare: mockBcryptCompare },
    }));
    jest.unstable_mockModule('jsonwebtoken', () => ({
      default: { sign: mockJwtSign },
    }));
  });

  it('Debe devolver 400 si faltan credenciales', async () => {
    // Escenario de Error
    req.body = { name: '' };

    const { login } = await import('../authController.js');
    await login(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Nombre de usuario y contraseña requeridos" });
  });

  it('Debe devolver 401 si el usuario no existe', async () => {
    // Escenario de Error
    req.body = { name: 'falso', password: '123' };
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const { login } = await import('../authController.js');
    await login(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Credenciales inválidas" });
  });

  it('Debe devolver el token y el usuario si el login es exitoso', async () => {
    // Escenario de Éxito
    req.body = { name: 'admin', password: 'correcta' };
    mockQuery.mockResolvedValueOnce({ 
      rows: [{ id: 1, name: 'admin', role: 'admin', password: 'hashed', avatar: 'url' }] 
    });
    mockBcryptCompare.mockResolvedValueOnce(true);
    mockJwtSign.mockReturnValueOnce('fake-jwt-token');

    const { login } = await import('../authController.js');
    await login(req, res, next);

    expect(res.json).toHaveBeenCalledWith({
      token: 'fake-jwt-token',
      user: { id: 1, name: 'admin', role: 'admin', avatar: 'url' }
    });
  });

  it('Debe verificar al usuario correctamente', async () => {
    req.user = { id: 1, name: 'admin' };

    const { verify } = await import('../authController.js');
    // Verify no usa await porque en tu código no interactúa con promesas/BD
    verify(req, res);

    expect(res.json).toHaveBeenCalledWith({ valid: true, user: req.user });
  });
});