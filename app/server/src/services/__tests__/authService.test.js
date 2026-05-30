import { jest } from '@jest/globals';

describe("Servicio de Autenticación (AuthService)", () => {
  let mockQuery, mockBcryptCompare, mockJwtSign;
  let AuthService;
  let authServiceInstance;

  beforeEach(async () => {
    jest.resetModules();

    mockQuery = jest.fn();
    mockBcryptCompare = jest.fn();
    mockJwtSign = jest.fn();

    jest.unstable_mockModule('bcrypt', () => ({
      default: { compare: mockBcryptCompare },
    }));
    jest.unstable_mockModule('jsonwebtoken', () => ({
      default: { sign: mockJwtSign },
    }));

    const module = await import('../authService.js');
    AuthService = module.AuthService;
    
    const fakePool = { query: mockQuery };
    authServiceInstance = new AuthService(fakePool, 'test-secret');
  });

  describe("loginUser", () => {
    it("Debería lanzar error 401 si el usuario no existe en la base de datos", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(authServiceInstance.loginUser('fantasma', '123')).rejects.toThrow("Credenciales inválidas");
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("SELECT * FROM usuarios"), ['fantasma']);
    });

    it("Debería lanzar error 401 si la contraseña proporcionada es incorrecta", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, name: 'admin', password: 'hashed' }] });
      mockBcryptCompare.mockResolvedValueOnce(false); 

      await expect(authServiceInstance.loginUser('admin', 'mala')).rejects.toThrow("Credenciales inválidas");
    });

    it("Debería emitir un JWT válido y los datos del usuario si las credenciales coinciden", async () => {
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