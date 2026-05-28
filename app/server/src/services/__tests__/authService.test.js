// server/src/services/__tests__/authService.test.js
import { jest } from '@jest/globals';

describe("🛡️ Servicio de Autenticación (AuthService)", () => {
  let mockQuery, mockBcryptCompare, mockJwtSign;
  let AuthService;
  let authServiceInstance;

  beforeEach(async () => {
    jest.resetModules();

    mockQuery = jest.fn();
    mockBcryptCompare = jest.fn();
    mockJwtSign = jest.fn();

    // Mockeamos las dependencias externas
    jest.unstable_mockModule('bcrypt', () => ({
      default: { compare: mockBcryptCompare },
    }));
    jest.unstable_mockModule('jsonwebtoken', () => ({
      default: { sign: mockJwtSign },
    }));

    // Importamos dinámicamente el servicio DESPUÉS de mockear
    const module = await import('../authService.js');
    AuthService = module.AuthService;
    
    // Instanciamos inyectando un pool falso y un secreto falso
    const fakePool = { query: mockQuery };
    authServiceInstance = new AuthService(fakePool, 'test-secret');
  });

  describe("loginUser", () => {
    it("❌ Debería fallar (401) si el usuario no existe en la BD", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(authServiceInstance.loginUser('fantasma', '123')).rejects.toThrow("Credenciales inválidas");
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("SELECT * FROM usuarios"), ['fantasma']);
    });

    it("❌ Debería fallar (401) si la contraseña es incorrecta", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, name: 'admin', password: 'hashed' }] });
      mockBcryptCompare.mockResolvedValueOnce(false); // Bcrypt dice que no coinciden

      await expect(authServiceInstance.loginUser('admin', 'mala')).rejects.toThrow("Credenciales inválidas");
    });

    it("✅ Debería devolver un token y los datos del usuario si todo es correcto", async () => {
      mockQuery.mockResolvedValueOnce({ 
        rows: [{ id: 1, name: 'admin', role: 'admin', password: 'hashed', avatar: 'url.png' }] 
      });
      mockBcryptCompare.mockResolvedValueOnce(true);
      mockJwtSign.mockReturnValueOnce('fake-jwt-token');

      const result = await authServiceInstance.loginUser('admin', 'correcta');

      expect(result).toHaveProperty('token', 'fake-jwt-token');
      expect(result.user).toEqual({ id: 1, name: 'admin', role: 'admin', avatar: 'url.png' });
    });
  });
});