import { jest } from '@jest/globals';

describe("Servicio de Usuarios (UserService)", () => {
  let mockQuery, mockConnect, mockClientQuery, mockClientRelease, mockBcryptHash, mockBcryptCompare;
  let UserService;
  let userServiceInstance;

  beforeEach(async () => {
    jest.resetModules();

    mockQuery = jest.fn();
    mockClientQuery = jest.fn();
    mockClientRelease = jest.fn();
    
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
    it("Debería arrojar error 404 al solicitar perfil de un ID inexistente", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      await expect(userServiceInstance.getUserProfile(99)).rejects.toThrow("Usuario no encontrado");
    });

    it("Debería estructurar y devolver los campos públicos de perfil", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, name: 'Test' }] });
      const result = await userServiceInstance.getUserProfile(1);
      expect(result).toEqual({ id: 1, name: 'Test' });
    });

    it("Debería prevenir el cambio de credenciales si la verificación de la contraseña antigua fracasa", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, password: 'old-hash' }] });
      mockBcryptCompare.mockResolvedValueOnce(false);

      await expect(userServiceInstance.updateUserPassword(1, 'mala', 'nueva')).rejects.toThrow("incorrecta");
    });
  });

  describe("createNewUser", () => {
    it("Debería asegurar unicidad de entidad rechazando registros duplicados (409)", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] }); 
      await expect(userServiceInstance.createNewUser('pepe', 'operador', '123')).rejects.toThrow("ya está en uso");
    });

    it("Debería encriptar las credenciales mediante Hash y persistir al usuario", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] }); 
      mockBcryptHash.mockResolvedValueOnce('new-hash');
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 5, name: 'pepe', role: 'operador' }] });

      const result = await userServiceInstance.createNewUser('pepe', 'operador', '123');
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO usuarios"), ['pepe', 'operador', 'new-hash']);
      expect(result).toHaveProperty('name', 'pepe');
    });
  });

  describe("Transacción: deleteExistingUser", () => {
    it("SEGURIDAD: Debería bloquear hardcoded delete requests sobre cuentas raíz (1, 2, 3)", async () => {
      await expect(userServiceInstance.deleteExistingUser("1")).rejects.toThrow("Acción denegada");
      expect(mockConnect).not.toHaveBeenCalled(); 
    });

    it("Debería garantizar retención de rol bloqueando la eliminación del último administrador", async () => {
      mockClientQuery
        .mockResolvedValueOnce(undefined) 
        .mockResolvedValueOnce({ rows: [{ role: 'admin' }] }) 
        .mockResolvedValueOnce({ rows: [{ count: '1' }] }); 

      await expect(userServiceInstance.deleteExistingUser("4")).rejects.toThrow("al menos un administrador");
      
      expect(mockClientQuery).toHaveBeenCalledWith("ROLLBACK");
      expect(mockClientRelease).toHaveBeenCalled();
    });

    it("Debería proceder con el ciclo normal de eliminación si no infringe restricciones de rol", async () => {
      mockClientQuery
        .mockResolvedValueOnce(undefined) 
        .mockResolvedValueOnce({ rows: [{ role: 'operador' }] }) 
        .mockResolvedValueOnce(undefined); 

      const result = await userServiceInstance.deleteExistingUser("5");
      
      expect(mockClientQuery).toHaveBeenCalledWith("COMMIT");
      expect(mockClientRelease).toHaveBeenCalled();
      expect(result.message).toBe("Usuario eliminado correctamente");
    });
  });
  
  describe("Operaciones Secundarias (Users)", () => {
    it("Debería resolver la colección entera de usuarios en el sistema", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }, { id: 2 }] });
      const result = await userServiceInstance.getAllUsers();
      expect(result.length).toBe(2);
    });

    it("Debería ejecutar actualizaciones parciales omitiendo la columna de credenciales", async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 1 });
      const result = await userServiceInstance.updateExistingUser(1, "Editado", "admin", null);
      expect(result.message).toMatch(/actualizado/i);
    });

    it("Debería ejecutar reescritura de hash si se suministra un password opcional nuevo", async () => {
      mockBcryptHash.mockResolvedValueOnce("hash");
      mockQuery.mockResolvedValueOnce({ rowCount: 1 });
      const result = await userServiceInstance.updateExistingUser(1, "Editado", "admin", "123");
      expect(result.message).toMatch(/actualizado/i);
    });

    it("Debería arrojar error 404 ante solicitudes de edición en cuentas huérfanas", async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 0 });
      await expect(userServiceInstance.updateExistingUser(99, "a", "b")).rejects.toThrow("Usuario no encontrado");
    });

    it("Debería reflejar cambios asíncronos en el valor URL del avatar", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, avatar: "url" }] });
      const result = await userServiceInstance.updateUserAvatar(1, "url");
      expect(result.message).toMatch(/Avatar actualizado/i);
    });

    it("Debería rechazar la actualización de imagen en perfiles borrados lógicamente o físicos", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      await expect(userServiceInstance.updateUserAvatar(99, "url")).rejects.toThrow("Usuario no encontrado");
    });
  });
});