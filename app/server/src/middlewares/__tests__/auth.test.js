import { jest } from '@jest/globals';

describe("Filtros de Seguridad de Rutas", () => {
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

  describe("Validación de Token", () => {
    it("Debería emitir error 401 bloqueando petición si falta Authorization", () => {
      const req = { headers: {} }; 
      const res = getMockRes();
      const next = jest.fn();

      authenticateToken(req, res, next);
      
      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
    });

    it("Debería emitir error 403 si JWT detecta manipulación o expiración", () => {
      const req = { headers: { authorization: "Bearer mal-token" } };
      const res = getMockRes();
      const next = jest.fn();

      mockJwtVerify.mockImplementation((token, secret, callback) => {
        callback(new Error("JWT Error"), null); 
      });
      
      authenticateToken(req, res, next);
      
      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
    });

    it("Debería inyectar payload en req.user si verificación es exitosa", () => {
      const req = { headers: { authorization: "Bearer buen-token" } };
      const res = getMockRes();
      const next = jest.fn();

      mockJwtVerify.mockImplementation((token, secret, callback) => {
        callback(null, { id: 1, role: 'admin' }); 
      });
      
      authenticateToken(req, res, next);
      
      expect(req.user).toEqual({ id: 1, role: 'admin' });
      expect(next).toHaveBeenCalledWith(); 
    });
  });

  describe("Control de Roles", () => {
    it("Debería emitir error 403 si usuario no posee privilegios", () => {
      const req = { user: { role: 'operador' } };
      const res = getMockRes();
      const next = jest.fn();

      requireAdmin(req, res, next);
      
      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
    });

    it("Debería permitir continuar cadena de middleware si el rol es válido", () => {
      const req = { user: { role: 'admin' } };
      const res = getMockRes();
      const next = jest.fn();

      requireAdmin(req, res, next);
      
      expect(next).toHaveBeenCalledWith(); 
    });
  });
});
