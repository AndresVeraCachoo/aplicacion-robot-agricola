import { jest } from '@jest/globals';

describe("Middleware Global de Errores (errorHandler)", () => {
  let errorHandler, AppError, catchAsync, req, res, next;

  beforeEach(async () => {
    jest.resetModules();
    const module = await import('../errorHandler.js');
    errorHandler = module.errorHandler;
    AppError = module.AppError;
    catchAsync = module.catchAsync;

    req = {};
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => { jest.restoreAllMocks(); });

  describe("Errores Dinámicos y Nativos", () => {
    it("✅ Debería manejar errores de validación de Zod y enviar detalles (400)", async () => {
      const { ZodError } = await import('zod');
      const err = new ZodError([{ message: "Requerido", path: ["nombre"] }]);
      errorHandler(err, req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ 
        errorCode: "VALIDATION_ERROR",
        details: expect.any(Array) 
      }));
    });

    it("✅ Debería manejar AppError personalizado", () => {
      const err = new AppError("Sin permisos", 403, "FORBIDDEN_ACTION");
      errorHandler(err, req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: "Sin permisos", errorCode: "FORBIDDEN_ACTION" });
    });

    it("❌ Debería manejar SyntaxError de Express (JSON mal formado)", () => {
      const err = new SyntaxError("Unexpected string in JSON");
      err.status = 400;
      err.body = "{ bad: json }";
      
      errorHandler(err, req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ errorCode: "BAD_JSON_FORMAT" }));
    });

    it("❌ Debería manejar Payload Too Large de Express", () => {
      const err = new Error("Too large");
      err.type = "entity.too.large";
      
      errorHandler(err, req, res, next);
      expect(res.status).toHaveBeenCalledWith(413);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ errorCode: "PAYLOAD_TOO_LARGE" }));
    });

    it("❌ Debería hacer fallback a 500 para errores desconocidos", () => {
      const err = new Error("Se cayó la base de datos");
      errorHandler(err, req, res, next);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Se cayó la base de datos", errorCode: "UNKNOWN_ERROR" });
    });
  });

  describe("Errores de Base de Datos (PostgreSQL)", () => {
    const dbErrors = [
      ["23505", "Registro duplicado", 400, "DB_DUPLICATE_RECORD"],
      ["23503", "restricción relacional", 400, "DB_FOREIGN_KEY_VIOLATION"],
      ["23502", "Faltan datos obligatorios", 400, "DB_MISSING_DATA"],
      ["22P02", "Formato de dato", 400, "DB_INVALID_FORMAT"]
    ];

    it.each(dbErrors)("✅ Debería manejar el error código %s", (code, expectedMsg, expectedStatus, expectedCode) => {
      const err = new Error("DB Error");
      err.code = code;
      errorHandler(err, req, res, next);
      expect(res.status).toHaveBeenCalledWith(expectedStatus);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ errorCode: expectedCode }));
    });
  });

  describe("Errores de Seguridad (JWT)", () => {
    const jwtErrors = [
      ["JsonWebTokenError", "Firma de seguridad", 401, "AUTH_INVALID_TOKEN"],
      ["TokenExpiredError", "La sesión ha caducado", 401, "AUTH_TOKEN_EXPIRED"]
    ];

    it.each(jwtErrors)("✅ Debería manejar el error %s", (name, expectedMsg, expectedStatus, expectedCode) => {
      const err = new Error("JWT Error");
      err.name = name;
      errorHandler(err, req, res, next);
      expect(res.status).toHaveBeenCalledWith(expectedStatus);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ errorCode: expectedCode }));
    });
  });

  describe("⚡ Utils y Logging", () => {
    it("✅ catchAsync debería capturar errores y derivarlos a next()", async () => {
      const errorSimulado = new Error("Falló");
      const fnFalla = async (req, res, next) => { throw errorSimulado; };
      await catchAsync(fnFalla)({}, {}, next);
      expect(next).toHaveBeenCalledWith(errorSimulado);
    });

    it("✅ Debería loguear errores en consola si no es entorno de test", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";
      
      const err = new AppError("Fallo", 400);
      errorHandler(err, req, res, next);
      expect(console.error).toHaveBeenCalled();
      
      const critErr = new Error("Fallo grave");
      errorHandler(critErr, req, res, next);
      expect(console.error).toHaveBeenCalled();
      
      process.env.NODE_ENV = originalEnv;
    });
  });
});