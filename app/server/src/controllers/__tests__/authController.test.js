import { jest } from '@jest/globals';
import { AuthController } from '../authController.js';

describe("Controlador de Autenticación", () => {
  let mockAuthService;
  let authController;
  let req, res, next;

  beforeEach(() => {
    mockAuthService = {
      loginUser: jest.fn(),
      refreshUserToken: jest.fn(),
    };

    authController = new AuthController(mockAuthService);

    req = { body: {}, user: {}, cookies: {} };
    res = { json: jest.fn(), cookie: jest.fn(), clearCookie: jest.fn() };
    next = jest.fn();
  });

  describe("inicio de sesión", () => {
    it("Debería retornar tokens y datos si el servicio aprueba el login", async () => {
      req.body = { name: "admin", password: "123" };
      const authDataSimulada = { accessToken: "access-token-falso", refreshToken: "refresh-token-falso", user: { id: 1, name: "admin" } };
      
      mockAuthService.loginUser.mockResolvedValueOnce(authDataSimulada);

      await authController.login(req, res, next);

      expect(mockAuthService.loginUser).toHaveBeenCalledWith("admin", "123");
      expect(res.cookie).toHaveBeenCalledWith("accessToken", "access-token-falso", expect.any(Object));
      expect(res.cookie).toHaveBeenCalledWith("refreshToken", "refresh-token-falso", expect.any(Object));
      expect(res.json).toHaveBeenCalledWith({ user: authDataSimulada.user, accessToken: authDataSimulada.accessToken });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe("cierre de sesión", () => {
    it("Debería limpiar las cookies de tokens y confirmar el cierre", () => {
      authController.logout(req, res);
      expect(res.clearCookie).toHaveBeenCalledWith("accessToken", expect.any(Object));
      expect(res.clearCookie).toHaveBeenCalledWith("refreshToken", expect.any(Object));
      expect(res.json).toHaveBeenCalledWith({ message: "Sesión cerrada correctamente" });
    });
  });

  describe("refresco de token", () => {
    it("Debería retornar 401 si no hay refresh token", async () => {
      const resStatus = jest.fn().mockReturnThis();
      const resJson = jest.fn();
      res = { status: resStatus, json: resJson };
      
      await authController.refresh(req, res, next);
      
      expect(resStatus).toHaveBeenCalledWith(401);
      expect(resJson).toHaveBeenCalledWith({ message: "No refresh token provided" });
    });

    it("Debería retornar nuevos tokens y setear cookies si el servicio aprueba el refresco", async () => {
      req.cookies = { refreshToken: "viejo-refresh-token" };
      const authDataSimulada = { accessToken: "nuevo-access", refreshToken: "nuevo-refresh", user: { id: 1, name: "admin" } };
      
      mockAuthService.refreshUserToken.mockResolvedValueOnce(authDataSimulada);

      await authController.refresh(req, res, next);

      expect(mockAuthService.refreshUserToken).toHaveBeenCalledWith("viejo-refresh-token");
      expect(res.cookie).toHaveBeenCalledWith("accessToken", "nuevo-access", expect.any(Object));
      expect(res.cookie).toHaveBeenCalledWith("refreshToken", "nuevo-refresh", expect.any(Object));
      expect(res.json).toHaveBeenCalledWith({ user: authDataSimulada.user, accessToken: authDataSimulada.accessToken });
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
      { method: "refresh", serviceMethod: "refreshUserToken", isRefresh: true },
    ];

    it.each(endpoints)("Should route errors from $method to the next() middleware", async ({ method, serviceMethod, isRefresh }) => {
      if (isRefresh) {
        req.cookies = { refreshToken: "viejo" };
      }
      const errorMock = new Error("Credenciales inválidas");
      mockAuthService[serviceMethod].mockRejectedValueOnce(errorMock);
      
      await authController[method](req, res, next);
      
      expect(next).toHaveBeenCalledWith(errorMock);
    });
  });
});
