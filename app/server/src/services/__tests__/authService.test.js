import { jest } from '@jest/globals';

describe("Servicio de Autenticación", () => {
  let mockFindUnique, mockBcryptCompare, mockJwtSign, mockCryptoRandom, mockRedisSet, mockRedisGet, mockRedisDel;
  let AuthService;
  let authServiceInstance;

  beforeEach(async () => {
    jest.resetModules();

    mockFindUnique = jest.fn();
    mockBcryptCompare = jest.fn();
    mockJwtSign = jest.fn();
    mockCryptoRandom = jest.fn();
    mockRedisSet = jest.fn();
    mockRedisGet = jest.fn();
    mockRedisDel = jest.fn();

    jest.unstable_mockModule('bcrypt', () => ({
      default: { compare: mockBcryptCompare },
    }));
    jest.unstable_mockModule('jsonwebtoken', () => ({
      default: { sign: mockJwtSign },
    }));
    jest.unstable_mockModule('crypto', () => ({
      default: { randomBytes: mockCryptoRandom },
    }));
    jest.unstable_mockModule('../../config/redis.js', () => ({
      default: { set: mockRedisSet, get: mockRedisGet, del: mockRedisDel },
    }));

    const module = await import('../authService.js');
    AuthService = module.AuthService;
    
    const fakePrisma = { 
      user: { findUnique: mockFindUnique } 
    };
    authServiceInstance = new AuthService(fakePrisma, 'test-secret');
  });

  describe("loginUser", () => {
    it("Debería lanzar error 401 si el usuario no existe en la BD", async () => {
      mockFindUnique.mockResolvedValueOnce(null);
      await expect(authServiceInstance.loginUser('fantasma', '123')).rejects.toThrow("Invalid credentials");
    });

    it("Debería lanzar error 401 si la contraseña provista es incorrecta", async () => {
      mockFindUnique.mockResolvedValueOnce({ id: 1, name: 'admin', password: 'hashed' });
      mockBcryptCompare.mockResolvedValueOnce(false); 
      await expect(authServiceInstance.loginUser('admin', 'mala')).rejects.toThrow("Invalid credentials");
    });

    it("Debería emitir access/refresh tokens si las credenciales coinciden", async () => {
      mockFindUnique.mockResolvedValueOnce({ 
        id: 1, name: 'admin', role: 'admin', password: 'hashed', avatar: 'url.png' 
      });
      mockBcryptCompare.mockResolvedValueOnce(true);
      mockJwtSign.mockReturnValueOnce('fake-access-token');
      mockCryptoRandom.mockReturnValueOnce({ toString: () => 'fake-refresh-token' });
      mockRedisSet.mockResolvedValueOnce('OK');

      const result = await authServiceInstance.loginUser('admin', 'correcta');

      expect(result).toHaveProperty('accessToken', 'fake-access-token');
      expect(result).toHaveProperty('refreshToken', 'fake-refresh-token');
      expect(mockRedisSet).toHaveBeenCalledWith('refresh_token:fake-refresh-token', 1, 'EX', expect.any(Number));
    });
  });

  describe("refreshUserToken", () => {
    it("Debería lanzar 401 si no hay refresh token", async () => {
      await expect(authServiceInstance.refreshUserToken(null)).rejects.toThrow("No refresh token provided");
    });

    it("Debería lanzar 401 si redis no encuentra el token", async () => {
      mockRedisGet.mockResolvedValueOnce(null);
      await expect(authServiceInstance.refreshUserToken('token-falso')).rejects.toThrow("Invalid or expired refresh token");
    });

    it("Debería emitir nuevos tokens y rotar en redis si es exitoso", async () => {
      mockRedisGet.mockResolvedValueOnce('1');
      mockFindUnique.mockResolvedValueOnce({ id: 1, name: 'admin', role: 'admin' });
      mockRedisDel.mockResolvedValueOnce(1);
      mockJwtSign.mockReturnValueOnce('new-access');
      mockCryptoRandom.mockReturnValueOnce({ toString: () => 'new-refresh' });
      mockRedisSet.mockResolvedValueOnce('OK');

      const result = await authServiceInstance.refreshUserToken('viejo-refresh');
      expect(mockRedisDel).toHaveBeenCalledWith('refresh_token:viejo-refresh');
      expect(mockRedisSet).toHaveBeenCalledWith('refresh_token:new-refresh', 1, 'EX', expect.any(Number));
      expect(result).toHaveProperty('accessToken', 'new-access');
    });
  });
});
