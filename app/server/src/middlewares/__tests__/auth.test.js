// server/src/middlewares/__tests__/auth.test.js
import { jest } from '@jest/globals';

describe("🔐 Middlewares de Autenticación", () => {
  let mockJwtVerify, authenticateToken, requireAdmin;

  beforeEach(async () => {
    jest.resetModules();
    mockJwtVerify = jest.fn();

    jest.unstable_mockModule('jsonwebtoken', () => ({
      default: { verify: mockJwtVerify }
    }));
    jest.unstable_mockModule('../../config/env.js', () => ({
      env: { JWT_SECRET: 'super-secret' }
    }));

    const authModule = await import('../auth.js');
    authenticateToken = authModule.authenticateToken;
    requireAdmin = authModule.requireAdmin;
  });

  const getMockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  describe("authenticateToken", () => {
    it("❌ Debería rechazar (401) si no se envía ningún Token", () => {
      const req = { headers: {} }; 
      const res = getMockRes();
      const next = jest.fn();

      authenticateToken(req, res, next);
      
      // FIX: Tu código llama a next() pasándole un Error con statusCode
      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
    });

    it("❌ Debería rechazar (403) si el Token es inválido o caducado", () => {
      const req = { headers: { authorization: "Bearer mal-token" } };
      const res = getMockRes();
      const next = jest.fn();

      // FIX: jwt.verify usa un callback (err, user), no devuelve de forma síncrona
      mockJwtVerify.mockImplementation((token, secret, callback) => {
        callback(new Error("JWT Error"), null); // Simulamos el error en el callback
      });
      
      authenticateToken(req, res, next);
      
      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
    });

    it("✅ Debería inyectar el usuario en 'req' y permitir paso si el Token es válido", () => {
      const req = { headers: { authorization: "Bearer buen-token" } };
      const res = getMockRes();
      const next = jest.fn();

      // FIX: Llamamos al callback con null (sin error) y el objeto del usuario
      mockJwtVerify.mockImplementation((token, secret, callback) => {
        callback(null, { id: 1, role: 'admin' }); 
      });
      
      authenticateToken(req, res, next);
      
      expect(req.user).toEqual({ id: 1, role: 'admin' });
      expect(next).toHaveBeenCalledWith(); // Llamada vacía significa que continuó el flujo
    });
  });

  describe("requireAdmin", () => {
    it("❌ Debería rechazar (403) si el rol no es admin", () => {
      const req = { user: { role: 'operador' } };
      const res = getMockRes();
      const next = jest.fn();

      requireAdmin(req, res, next);
      
      // FIX: Tu código lanza un custom error al next()
      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
    });

    it("✅ Debería permitir el paso si el rol es admin", () => {
      const req = { user: { role: 'admin' } };
      const res = getMockRes();
      const next = jest.fn();

      requireAdmin(req, res, next);
      
      expect(next).toHaveBeenCalledWith(); // Éxito
    });
  });
});