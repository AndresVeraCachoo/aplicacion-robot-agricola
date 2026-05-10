// server/src/middlewares/__tests__/auth.test.js
import { jest } from '@jest/globals';

describe('Auth Middleware', () => {
  let req, res, next, mockJwtVerify;

  beforeEach(() => {
    jest.resetModules(); // Limpia la caché
    
    // ARRANGE genérico
    req = { headers: {}, user: {} };
    res = {}; // El auth middleware no usa 'res', usa 'next'
    next = jest.fn();
    mockJwtVerify = jest.fn();

    // Levantamos el escudo para jsonwebtoken
    jest.unstable_mockModule('jsonwebtoken', () => ({
      default: { verify: mockJwtVerify }
    }));
  });

  describe('authenticateToken', () => {
    it('Debe bloquear (401) si no se proporciona el encabezado de autorización', async () => {
      // 1. ARRANGE
      req.headers['authorization'] = undefined;
      const { authenticateToken } = await import('../auth.js');

      // 2. ACT
      authenticateToken(req, res, next);

      // 3. ASSERT
      expect(next).toHaveBeenCalledTimes(1);
      const errorArg = next.mock.calls[0][0]; // Capturamos el error que se le pasó a next()
      expect(errorArg).toBeInstanceOf(Error);
      expect(errorArg.statusCode).toBe(401);
      expect(errorArg.message).toContain("Token no proporcionado");
    });

    it('Debe bloquear (403) si el token es inválido o ha expirado', async () => {
      // 1. ARRANGE
      req.headers['authorization'] = 'Bearer token-falso';
      
      // Simulamos que jwt.verify lanza un error a través de su callback
      mockJwtVerify.mockImplementation((token, secret, callback) => {
        callback(new Error('Token expirado'), null);
      });

      const { authenticateToken } = await import('../auth.js');

      // 2. ACT
      authenticateToken(req, res, next);

      // 3. ASSERT
      expect(next).toHaveBeenCalledTimes(1);
      const errorArg = next.mock.calls[0][0];
      expect(errorArg.statusCode).toBe(403);
      expect(errorArg.message).toContain("Token inválido o expirado");
    });

    it('Debe permitir el paso e inyectar el usuario en req si el token es válido', async () => {
      // 1. ARRANGE
      const usuarioSimulado = { id: 1, role: 'admin' };
      req.headers['authorization'] = 'Bearer token-bueno';
      
      // Simulamos que jwt.verify tiene éxito y devuelve el usuario
      mockJwtVerify.mockImplementation((token, secret, callback) => {
        callback(null, usuarioSimulado);
      });

      const { authenticateToken } = await import('../auth.js');

      // 2. ACT
      authenticateToken(req, res, next);

      // 3. ASSERT
      expect(req.user).toEqual(usuarioSimulado); // El usuario debe estar en req
      expect(next).toHaveBeenCalledWith(); // next debe ser llamado sin argumentos (éxito)
    });
  });

  describe('requireAdmin', () => {
    it('Debe bloquear (403) si el usuario no es administrador', async () => {
      // 1. ARRANGE
      req.user = { role: 'operador' }; // Rol inferior
      const { requireAdmin } = await import('../auth.js');

      // 2. ACT
      requireAdmin(req, res, next);

      // 3. ASSERT
      expect(next).toHaveBeenCalledTimes(1);
      const errorArg = next.mock.calls[0][0];
      expect(errorArg.statusCode).toBe(403);
      expect(errorArg.message).toContain("Se requiere rol de administrador");
    });

    it('Debe permitir el paso si el usuario es administrador', async () => {
      // 1. ARRANGE
      req.user = { role: 'admin' }; // Rol correcto
      const { requireAdmin } = await import('../auth.js');

      // 2. ACT
      requireAdmin(req, res, next);

      // 3. ASSERT
      expect(next).toHaveBeenCalledWith(); // next llamado sin errores
    });
  });
});