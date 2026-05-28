// server/src/services/__tests__/userService.test.js
import { jest } from '@jest/globals';

describe("👥 Servicio de Usuarios (UserService)", () => {
  let mockQuery, mockConnect, mockClientQuery, mockClientRelease, mockBcryptHash, mockBcryptCompare;
  let UserService;
  let userServiceInstance;

  beforeEach(async () => {
    jest.resetModules();

    mockQuery = jest.fn();
    mockClientQuery = jest.fn();
    mockClientRelease = jest.fn();
    // Simula pool.connect() devolviendo un cliente con sus propios métodos
    mockConnect = jest.fn().mockResolvedValue({ query: mockClientQuery, release: mockClientRelease });

    mockBcryptHash = jest.fn();
    mockBcryptCompare = jest.fn();

    jest.unstable_mockModule('bcrypt', () => ({
      default: { hash: mockBcryptHash, compare: mockBcryptCompare },
    }));

    const module = await import('../userService.js');
    UserService = module.UserService;
    
    const fakePool = { query: mockQuery, connect: mockConnect };
    userServiceInstance = new UserService(fakePool);
  });

  describe("getUserProfile & updateUserPassword", () => {
    it("❌ Debería fallar (404) si el perfil no existe", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      await expect(userServiceInstance.getUserProfile(99)).rejects.toThrow("Usuario no encontrado");
    });

    it("✅ Debería devolver el perfil del usuario", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, name: 'Test' }] });
      const result = await userServiceInstance.getUserProfile(1);
      expect(result).toEqual({ id: 1, name: 'Test' });
    });

    it("❌ Debería bloquear el cambio de contraseña si la actual es mala (400)", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, password: 'old-hash' }] });
      mockBcryptCompare.mockResolvedValueOnce(false);

      await expect(userServiceInstance.updateUserPassword(1, 'mala', 'nueva')).rejects.toThrow("incorrecta");
    });
  });

  describe("createNewUser", () => {
    it("❌ Debería fallar (409) si el usuario ya existe", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // Existe
      await expect(userServiceInstance.createNewUser('pepe', 'operador', '123')).rejects.toThrow("ya está en uso");
    });

    it("✅ Debería hashear la contraseña y crear el usuario", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] }); // No existe
      mockBcryptHash.mockResolvedValueOnce('new-hash');
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 5, name: 'pepe', role: 'operador' }] });

      const result = await userServiceInstance.createNewUser('pepe', 'operador', '123');
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO usuarios"), ['pepe', 'operador', 'new-hash']);
      expect(result).toHaveProperty('name', 'pepe');
    });
  });

  describe("Transacción: deleteExistingUser", () => {
    it("🛡️ SEGURIDAD: Debería impedir borrar los usuarios del sistema (1, 2, 3)", async () => {
      await expect(userServiceInstance.deleteExistingUser("1")).rejects.toThrow("Acción denegada");
      // No debería ni siquiera intentar conectarse a la BD
      expect(mockConnect).not.toHaveBeenCalled(); 
    });

    it("❌ Transacción: Debería hacer ROLLBACK si el usuario es el último administrador", async () => {
      mockClientQuery
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [{ role: 'admin' }] }) // Es admin
        .mockResolvedValueOnce({ rows: [{ count: '1' }] }); // Es el último

      await expect(userServiceInstance.deleteExistingUser("4")).rejects.toThrow("al menos un administrador");
      
      expect(mockClientQuery).toHaveBeenCalledWith("ROLLBACK");
      expect(mockClientRelease).toHaveBeenCalled();
    });

    it("✅ Transacción: Debería borrar el usuario y hacer COMMIT", async () => {
      mockClientQuery
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [{ role: 'operador' }] }) // Es operador
        .mockResolvedValueOnce(undefined); // DELETE

      const result = await userServiceInstance.deleteExistingUser("5");
      
      expect(mockClientQuery).toHaveBeenCalledWith("COMMIT");
      expect(mockClientRelease).toHaveBeenCalled();
      expect(result.message).toBe("Usuario eliminado correctamente");
    });
  });
  
  describe("🔄 Otras Operaciones CRUD (Users)", () => {
    it("✅ Debería devolver todos los usuarios", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }, { id: 2 }] });
      const result = await userServiceInstance.getAllUsers();
      expect(result.length).toBe(2);
    });

    it("✅ Debería actualizar un usuario existente sin password", async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 1 });
      const result = await userServiceInstance.updateExistingUser(1, "Editado", "admin", null);
      expect(result.message).toMatch(/actualizado/i);
    });

    it("✅ Debería actualizar un usuario existente CON password", async () => {
      mockBcryptHash.mockResolvedValueOnce("hash");
      mockQuery.mockResolvedValueOnce({ rowCount: 1 });
      const result = await userServiceInstance.updateExistingUser(1, "Editado", "admin", "123");
      expect(result.message).toMatch(/actualizado/i);
    });

    it("❌ Debería fallar (404) al actualizar un usuario que no existe", async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 0 });
      await expect(userServiceInstance.updateExistingUser(99, "a", "b")).rejects.toThrow("Usuario no encontrado");
    });

    it("✅ Debería actualizar el avatar", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, avatar: "url" }] });
      const result = await userServiceInstance.updateUserAvatar(1, "url");
      expect(result.message).toMatch(/Avatar actualizado/i);
    });

    it("❌ Debería fallar (404) al actualizar avatar de un usuario borrado", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      await expect(userServiceInstance.updateUserAvatar(99, "url")).rejects.toThrow("Usuario no encontrado");
    });
  });
});