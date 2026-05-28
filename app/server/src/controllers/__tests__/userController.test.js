import { jest } from '@jest/globals';
import { UserController } from '../userController.js';

describe("👥 Controlador de Usuarios (UserController)", () => {
  let mockUserService, userController, req, res, next;

  beforeEach(() => {
    mockUserService = {
      getUserProfile: jest.fn(), updateUserPassword: jest.fn(), getAllUsers: jest.fn(),
      createNewUser: jest.fn(), updateExistingUser: jest.fn(), deleteExistingUser: jest.fn(), updateUserAvatar: jest.fn(),
    };
    userController = new UserController(mockUserService);
    req = { params: {}, body: {}, user: { id: 1 } };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
  });

  it("✅ getProfile: Debería devolver el perfil", async () => {
    mockUserService.getUserProfile.mockResolvedValueOnce({ id: 1 });
    await userController.getProfile(req, res, next);
    expect(res.json).toHaveBeenCalledWith({ id: 1 });
  });

  it("✅ updatePassword: Debería actualizar la contraseña", async () => {
    req.body = { currentPassword: "123", newPassword: "321" };
    mockUserService.updateUserPassword.mockResolvedValueOnce({ message: "OK" });
    await userController.updatePassword(req, res, next);
    expect(res.json).toHaveBeenCalled();
  });

  it("✅ getUsers: Debería listar usuarios", async () => {
    mockUserService.getAllUsers.mockResolvedValueOnce([]);
    await userController.getUsers(req, res, next);
    expect(res.json).toHaveBeenCalled();
  });

  it("✅ createUser: Debería devolver 201", async () => {
    req.body = { name: "Pepe", role: "admin", password: "1" };
    mockUserService.createNewUser.mockResolvedValueOnce({ id: 2 });
    await userController.createUser(req, res, next);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("✅ updateUser: Debería actualizar usuario", async () => {
    req.params.id = "1";
    mockUserService.updateExistingUser.mockResolvedValueOnce({ message: "OK" });
    await userController.updateUser(req, res, next);
    expect(res.json).toHaveBeenCalled();
  });

  it("✅ deleteUser: Debería borrar usuario", async () => {
    req.params.id = "1";
    mockUserService.deleteExistingUser.mockResolvedValueOnce({ message: "OK" });
    await userController.deleteUser(req, res, next);
    expect(res.json).toHaveBeenCalled();
  });

  it("✅ updateAvatar: Debería actualizar avatar", async () => {
    req.body = { avatarUrl: "http://" };
    mockUserService.updateUserAvatar.mockResolvedValueOnce({ message: "OK" });
    await userController.updateAvatar(req, res, next);
    expect(res.json).toHaveBeenCalled();
  });

  describe("❌ Manejo de Errores Global", () => {
    const endpoints = [
      { method: "getProfile", serviceMethod: "getUserProfile" },
      { method: "updatePassword", serviceMethod: "updateUserPassword" },
      { method: "getUsers", serviceMethod: "getAllUsers" },
      { method: "createUser", serviceMethod: "createNewUser" },
      { method: "updateUser", serviceMethod: "updateExistingUser" },
      { method: "deleteUser", serviceMethod: "deleteExistingUser" },
      { method: "updateAvatar", serviceMethod: "updateUserAvatar" },
    ];

    it.each(endpoints)("Debería derivar errores de $method a next()", async ({ method, serviceMethod }) => {
      const errorMock = new Error("Fallo de conexión");
      mockUserService[serviceMethod].mockRejectedValueOnce(errorMock);
      
      await userController[method](req, res, next);
      
      expect(next).toHaveBeenCalledWith(errorMock);
    });
  });
});