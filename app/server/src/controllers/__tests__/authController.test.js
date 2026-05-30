import { jest } from '@jest/globals';
import { AuthController } from '../authController.js';

describe("Controlador de Autenticación (AuthController)", () => {
  let mockAuthService;
  let authController;
  let req, res, next;

  beforeEach(() => {
    mockAuthService = {
      loginUser: jest.fn(),
    };

    authController = new AuthController(mockAuthService);

    req = { body: {}, user: {} };
    res = { json: jest.fn() };
    next = jest.fn();
  });

  describe("login", () => {
    it("Debería devolver el token de acceso y los datos si el servicio aprueba el login", async () => {
      req.body = { name: "admin", password: "123" };
      const authDataSimulada = { token: "token-falso", user: { id: 1, name: "admin" } };
      
      mockAuthService.loginUser.mockResolvedValueOnce(authDataSimulada);

      await authController.login(req, res, next);

      expect(mockAuthService.loginUser).toHaveBeenCalledWith("admin", "123");
      expect(res.json).toHaveBeenCalledWith(authDataSimulada);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe("verify", () => {
    it("Debería validar la sesión devolviendo el usuario inyectado previamente", () => {
      req.user = { id: 1, role: "admin" };
      authController.verify(req, res);
      expect(res.json).toHaveBeenCalledWith({ valid: true, user: req.user });
    });
  });

  describe("Manejo Global de Excepciones", () => {
    const endpoints = [
      { method: "login", serviceMethod: "loginUser" },
    ];

    it.each(endpoints)("Debería derivar errores de $method al middleware next()", async ({ method, serviceMethod }) => {
      const errorMock = new Error("Credenciales inválidas");
      mockAuthService[serviceMethod].mockRejectedValueOnce(errorMock);
      
      await authController[method](req, res, next);
      
      expect(next).toHaveBeenCalledWith(errorMock);
    });
  });
});