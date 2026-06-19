import { jest } from '@jest/globals';

describe("Servicio de Autenticación", () => {
  let mockFindUnique, mockBcryptCompare, mockJwtSign;
  let AuthService;
  let authServiceInstance;

  beforeEach(async () => {
    jest.resetModules();

    mockFindUnique = jest.fn();
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
    
    const fakePrisma = { 
      user: { findUnique: mockFindUnique } 
    };
    authServiceInstance = new AuthService(fakePrisma, 'test-secret');
  });

  describe("loginUser", () => {
    it("Debería lanzar error 401 si el usuario no existe en la BD", async () => {
      mockFindUnique.mockResolvedValueOnce(null);

      await expect(authServiceInstance.loginUser('fantasma', '123')).rejects.toThrow("Invalid credentials");
      expect(mockFindUnique).toHaveBeenCalledWith({ where: { name: 'fantasma' } });
    });

    it("Debería lanzar error 401 si la contraseña provista es incorrecta", async () => {
      mockFindUnique.mockResolvedValueOnce({ id: 1, name: 'admin', password: 'hashed' });
      mockBcryptCompare.mockResolvedValueOnce(false); 

      await expect(authServiceInstance.loginUser('admin', 'mala')).rejects.toThrow("Invalid credentials");
    });

    it("Debería emitir JWT válido y datos si las credenciales coinciden", async () => {
      mockFindUnique.mockResolvedValueOnce({ 
        id: 1, name: 'admin', role: 'admin', password: 'hashed', avatar: 'url.png' 
      });
      mockBcryptCompare.mockResolvedValueOnce(true);
      mockJwtSign.mockReturnValueOnce('fake-jwt-token');

      const result = await authServiceInstance.loginUser('admin', 'correcta');

      expect(result).toHaveProperty('token', 'fake-jwt-token');
      expect(result.user).toEqual({ id: 1, name: 'admin', role: 'admin', avatar: 'url.png' });
    });
  });
});
