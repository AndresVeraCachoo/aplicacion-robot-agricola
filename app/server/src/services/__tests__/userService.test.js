import { jest } from '@jest/globals';

describe("Servicio de Usuarios", () => {
  let mockFindUnique, mockFindMany, mockCreate, mockUpdate, mockDelete, mockCount, mockTransaction;
  let mockBcryptHash, mockBcryptCompare;
  let UserService;
  let userServiceInstance;
  let fakePrisma;

  beforeEach(async () => {
    jest.resetModules();

    mockFindUnique = jest.fn();
    mockFindMany = jest.fn();
    mockCreate = jest.fn();
    mockUpdate = jest.fn();
    mockDelete = jest.fn();
    mockCount = jest.fn();
    
    // Simula la transacción para ejecutar simplemente el callback con fakePrisma
    mockTransaction = jest.fn(async (cb) => {
      return await cb(fakePrisma);
    });

    fakePrisma = {
      user: {
        findUnique: mockFindUnique,
        findMany: mockFindMany,
        create: mockCreate,
        update: mockUpdate,
        delete: mockDelete,
        count: mockCount,
      },
      $transaction: mockTransaction
    };

    mockBcryptHash = jest.fn();
    mockBcryptCompare = jest.fn();

    jest.unstable_mockModule('bcrypt', () => ({
      default: { hash: mockBcryptHash, compare: mockBcryptCompare },
    }));

    const module = await import('../userService.js');
    UserService = module.UserService;
    
    userServiceInstance = new UserService(fakePrisma);
  });

  describe("perfil y contraseña de usuario", () => {
    it("Debería lanzar error 404 al solicitar perfil de un ID inexistente", async () => {
      mockFindUnique.mockResolvedValueOnce(null);
      await expect(userServiceInstance.getUserProfile(99)).rejects.toThrow("User not found");
    });

    it("Debería estructurar y retornar los campos de perfil público", async () => {
      mockFindUnique.mockResolvedValueOnce({ id: 1, name: 'Test' });
      const result = await userServiceInstance.getUserProfile(1);
      expect(result).toEqual({ id: 1, name: 'Test' });
    });

    it("Debería prevenir cambio de credenciales si falla verificación antigua", async () => {
      mockFindUnique.mockResolvedValueOnce({ id: 1, password: 'old-hash' });
      mockBcryptCompare.mockResolvedValueOnce(false);

      await expect(userServiceInstance.updateUserPassword(1, 'mala', 'nueva')).rejects.toThrow("incorrect");
    });

    it("Debería lanzar error 404 si el usuario no existe al actualizar contraseña", async () => {
      mockFindUnique.mockResolvedValueOnce(null);
      await expect(userServiceInstance.updateUserPassword(99, 'current', 'new')).rejects.toThrow("User not found");
    });

    it("Debería actualizar contraseña si la actual es correcta", async () => {
      mockFindUnique.mockResolvedValueOnce({ id: 1, password: 'old-hash' });
      mockBcryptCompare.mockResolvedValueOnce(true);
      mockBcryptHash.mockResolvedValueOnce('new-hash');
      mockUpdate.mockResolvedValueOnce({ id: 1 });

      const result = await userServiceInstance.updateUserPassword(1, 'correcta', 'nueva');
      expect(result.message).toBe("Password updated successfully");
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        data: { password: 'new-hash' }
      }));
    });
  });

  describe("crear nuevo usuario", () => {
    it("Debería asegurar unicidad rechazando registros duplicados (409)", async () => {
      mockFindUnique.mockResolvedValueOnce({ id: 1 }); 
      await expect(userServiceInstance.createNewUser('pepe', 'operator', '123')).rejects.toThrow("in use");
    });

    it("Debería encriptar credenciales usando Hash y persistir usuario", async () => {
      mockFindUnique.mockResolvedValueOnce(null); 
      mockBcryptHash.mockResolvedValueOnce('new-hash');
      mockCreate.mockResolvedValueOnce({ id: 5, name: 'pepe', role: 'operator' });

      const result = await userServiceInstance.createNewUser('pepe', 'operator', '123');
      expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ data: { name: 'pepe', role: 'operator', password: 'new-hash' } }));
      expect(result.user).toHaveProperty('name', 'pepe');
    });
  });

  describe("Transacción de borrado", () => {
    it("Debería bloquear borrado directo en cuentas root (1, 2, 3)", async () => {
      await expect(userServiceInstance.deleteExistingUser("1")).rejects.toThrow("Access denied");
      expect(mockTransaction).not.toHaveBeenCalled(); 
    });

    it("Debería garantizar retención de rol bloqueando borrado del último admin", async () => {
      mockFindUnique.mockResolvedValueOnce({ role: 'admin' });
      mockCount.mockResolvedValueOnce(1); 

      await expect(userServiceInstance.deleteExistingUser("4")).rejects.toThrow("at least one administrator");
    });

    it("Debería lanzar error 404 si no se encuentra el usuario a borrar", async () => {
      mockFindUnique.mockResolvedValueOnce(null); 
      await expect(userServiceInstance.deleteExistingUser("99")).rejects.toThrow("User not found");
    });

    it("Debería proceder con ciclo de borrado normal si no viola restricciones", async () => {
      mockFindUnique.mockResolvedValueOnce({ role: 'operator' });
      mockDelete.mockResolvedValueOnce(undefined); 

      const result = await userServiceInstance.deleteExistingUser("5");
      
      expect(mockDelete).toHaveBeenCalledWith({ where: { id: 5 } });
      expect(result.message).toBe("User deleted successfully");
    });
  });
  
  describe("Operaciones Secundarias (Usuarios)", () => {
    it("Debería resolver toda la colección de usuarios", async () => {
      mockFindMany.mockResolvedValueOnce([{ id: 1 }, { id: 2 }]);
      const result = await userServiceInstance.getAllUsers();
      expect(result).toHaveLength(2);
    });

    it("Debería ejecutar actualizaciones parciales omitiendo la columna de credenciales", async () => {
      mockUpdate.mockResolvedValueOnce({ id: 1 });
      const result = await userServiceInstance.updateExistingUser(1, "Edited", "admin", null);
      expect(result.message).toMatch(/updated/i);
      expect(mockBcryptHash).not.toHaveBeenCalled();
    });

    it("Debería ejecutar reescritura de hash si se provee nueva contraseña opcional", async () => {
      mockBcryptHash.mockResolvedValueOnce("hash");
      mockUpdate.mockResolvedValueOnce({ id: 1 });
      const result = await userServiceInstance.updateExistingUser(1, "Edited", "admin", "123");
      expect(result.message).toMatch(/updated/i);
    });

    it("Debería lanzar error 404 en peticiones de edición de cuentas huérfanas", async () => {
      mockUpdate.mockRejectedValueOnce({ code: 'P2025' });
      await expect(userServiceInstance.updateExistingUser(99, "a", "b")).rejects.toThrow("User not found");
    });

    it("Debería relanzar errores genéricos desde updateExistingUser", async () => {
      const error = new Error("DB Error");
      error.code = 'P5000';
      mockUpdate.mockRejectedValueOnce(error);
      await expect(userServiceInstance.updateExistingUser(99, "a", "b")).rejects.toThrow("DB Error");
    });

    it("Debería reflejar cambios asíncronos en la URL de avatar", async () => {
      mockUpdate.mockResolvedValueOnce({ id: 1, avatar: "url" });
      const result = await userServiceInstance.updateUserAvatar(1, "url");
      expect(result.message).toMatch(/Avatar updated/i);
    });

    it("Debería rechazar actualización de imagen en perfiles borrados", async () => {
      mockUpdate.mockRejectedValueOnce({ code: 'P2025' });
      await expect(userServiceInstance.updateUserAvatar(99, "url")).rejects.toThrow("User not found");
    });

    it("Debería relanzar errores genéricos desde updateUserAvatar", async () => {
      const error = new Error("DB Error");
      error.code = 'P5000';
      mockUpdate.mockRejectedValueOnce(error);
      await expect(userServiceInstance.updateUserAvatar(99, "url")).rejects.toThrow("DB Error");
    });
  });
});
