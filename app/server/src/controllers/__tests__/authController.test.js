import { jest } from '@jest/globals';
import { AuthController } from '../authController.js';

describe("Controlador de Autenticación", () => {
  let mockAuthService;
  let authController;
  let req, res, next;

  beforeEach(() => {
    mockAuthService = {
      loginUser: jest.fn(),
    };

    authController = new AuthController(mockAuthService);

    req = { body: {}, user: {} };
    res = { json: jest.fn(), cookie: jest.fn(), clearCookie: jest.fn() };
    next = jest.fn();
  });

  describe("inicio de sesión", () => {
    it("Debería retornar token y datos si el servicio aprueba el login", async () => {
      req.body = { name: "admin", password: "123" };
      const authDataSimulada = { token: "token-falso", user: { id: 1, name: "admin" } };
      
      mockAuthService.loginUser.mockResolvedValueOnce(authDataSimulada);

      await authController.login(req, res, next);

      expect(mockAuthService.loginUser).toHaveBeenCalledWith("admin", "123");
      expect(res.cookie).toHaveBeenCalledWith("token", "token-falso", expect.any(Object));
      expect(res.json).toHaveBeenCalledWith(authDataSimulada);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe("cierre de sesión", () => {
    it("Debería limpiar la cookie de token y confirmar el cierre", () => {
      authController.logout(req, res);
      expect(res.clearCookie).toHaveBeenCalledWith("token", expect.any(Object));
      expect(res.json).toHaveBeenCalledWith({ message: "Sesión cerrada correctamente" });
    });
  });

  describe("verificación", () => {
    it("Debería validar la sesión retornando el usuario inyectado previamente", () => {
      req.user = { id: 1, role: "admin" };
      authController.verify(req, res);
      expect(res.json).toHaveBeenCalledWith({ valid: true, user: req.user });
    });
  });

  describe("Manejo Global de Excepciones", () => {
    const endpoints = [
      { method: "login", serviceMethod: "loginUser" },
    ];

    it.each(endpoints)("Should route errors from $method to the next() middleware", async ({ method, serviceMethod }) => {
      const errorMock = new Error("Credenciales inválidas");
      mockAuthService[serviceMethod].mockRejectedValueOnce(errorMock);
      
      await authController[method](req, res, next);
      
      expect(next).toHaveBeenCalledWith(errorMock);
    });
  });
});
