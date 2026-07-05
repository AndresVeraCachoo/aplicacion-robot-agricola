import { jest } from '@jest/globals';
import { UserController } from '../userController.js';
import { emailQueue } from '../../workers/emailWorker.js';

jest.spyOn(emailQueue, 'add').mockResolvedValue(true);

describe("Controlador de Usuario", () => {
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
    jest.clearAllMocks();
  });

  it("Debería retornar el perfil del usuario autenticado", async () => {
    mockUserService.getUserProfile.mockResolvedValueOnce({ id: 1 });
    await userController.getProfile(req, res, next);
    expect(res.json).toHaveBeenCalledWith({ id: 1 });
  });

  it("Debería actualizar la contraseña del usuario", async () => {
    req.body = { currentPassword: "123", newPassword: "321" };
    mockUserService.updateUserPassword.mockResolvedValueOnce({ message: "OK" });
    await userController.updatePassword(req, res, next);
    expect(res.json).toHaveBeenCalled();
  });

  it("Debería listar todos los usuarios registrados", async () => {
    mockUserService.getAllUsers.mockResolvedValueOnce([]);
    await userController.getUsers(req, res, next);
    expect(res.json).toHaveBeenCalled();
  });

  it("Debería retornar estado 201 al crear un nuevo usuario y encolar correo si hay email", async () => {
    req.body = { name: "Pepe", role: "admin", password: "1", email: "pepe@test.com" };
    mockUserService.createNewUser.mockResolvedValueOnce({ user: { id: 2, name: "Pepe" }, generatedPassword: "abc" });
    await userController.createUser(req, res, next);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(emailQueue.add).toHaveBeenCalledWith('welcomeEmail', {
      type: 'WELCOME_EMAIL',
      payload: { email: "pepe@test.com", username: "Pepe", tempPassword: "abc" }
    });
  });

  it("Debería crear usuario sin enviar correo si no se provee email", async () => {
    req.body = { name: "Juan", role: "operator", password: "1" };
    mockUserService.createNewUser.mockResolvedValueOnce({ user: { id: 3, name: "Juan" } });
    await userController.createUser(req, res, next);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(emailQueue.add).not.toHaveBeenCalled();
  });

  it("Debería actualizar los datos de un usuario existente", async () => {
    req.params.id = "1";
    mockUserService.updateExistingUser.mockResolvedValueOnce({ message: "OK" });
    await userController.updateUser(req, res, next);
    expect(res.json).toHaveBeenCalled();
  });

  it("Debería eliminar un usuario del sistema", async () => {
    req.params.id = "1";
    mockUserService.deleteExistingUser.mockResolvedValueOnce({ message: "OK" });
    await userController.deleteUser(req, res, next);
    expect(res.json).toHaveBeenCalled();
  });

  it("Debería actualizar la URL de avatar del usuario", async () => {
    req.body = { avatarUrl: "http://" };
    mockUserService.updateUserAvatar.mockResolvedValueOnce({ message: "OK" });
    await userController.updateAvatar(req, res, next);
    expect(res.json).toHaveBeenCalled();
  });

  describe("Manejo Global de Excepciones", () => {
    const endpoints = [
      { method: "getProfile", serviceMethod: "getUserProfile" },
      { method: "updatePassword", serviceMethod: "updateUserPassword" },
      { method: "getUsers", serviceMethod: "getAllUsers" },
      { method: "createUser", serviceMethod: "createNewUser" },
      { method: "updateUser", serviceMethod: "updateExistingUser" },
      { method: "deleteUser", serviceMethod: "deleteExistingUser" },
      { method: "updateAvatar", serviceMethod: "updateUserAvatar" },
    ];

    it.each(endpoints)("Should route errors from $method to the next() middleware", async ({ method, serviceMethod }) => {
      const errorMock = new Error("Fallo de conexión");
      mockUserService[serviceMethod].mockRejectedValueOnce(errorMock);
      
      await userController[method](req, res, next);
      
      expect(next).toHaveBeenCalledWith(errorMock);
    });
  });
});
