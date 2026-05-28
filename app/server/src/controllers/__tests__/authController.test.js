// server/src/controllers/__tests__/authController.test.js
import { jest } from '@jest/globals';
import { AuthController } from '../authController.js';

describe("🔌 Controlador de Autenticación (AuthController)", () => {
  let mockAuthService;
  let authController;
  let req, res, next;

  beforeEach(() => {
    // 1. Creamos un Servicio Falso (Mock)
    mockAuthService = {
      loginUser: jest.fn(),
    };

    // 2. Instanciamos el controlador inyectándole el servicio falso
    authController = new AuthController(mockAuthService);

    // 3. Preparamos los objetos de Express
    req = { body: {}, user: {} };
    res = { json: jest.fn() };
    next = jest.fn();
  });

  describe("login", () => {
    it("✅ Debería devolver el token y los datos si el servicio tiene éxito", async () => {
      req.body = { name: "admin", password: "123" };
      const authDataSimulada = { token: "token-falso", user: { id: 1, name: "admin" } };
      
      mockAuthService.loginUser.mockResolvedValueOnce(authDataSimulada);

      await authController.login(req, res, next);

      expect(mockAuthService.loginUser).toHaveBeenCalledWith("admin", "123");
      expect(res.json).toHaveBeenCalledWith(authDataSimulada);
      expect(next).not.toHaveBeenCalled();
    });

    it("❌ Debería derivar al errorHandler (next) si el servicio lanza un error", async () => {
      req.body = { name: "admin", password: "mala" };
      const errorSimulado = new Error("Credenciales inválidas");
      
      mockAuthService.loginUser.mockRejectedValueOnce(errorSimulado);

      await authController.login(req, res, next);

      expect(next).toHaveBeenCalledWith(errorSimulado);
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("verify", () => {
    it("✅ Debería devolver valid: true y el usuario inyectado", () => {
      req.user = { id: 1, role: "admin" };
      authController.verify(req, res);
      expect(res.json).toHaveBeenCalledWith({ valid: true, user: req.user });
    });
  });
});