import { jest } from '@jest/globals';

describe("Middleware de Errores Globales", () => {
  let errorHandler, AppError, req, res, next;

  beforeEach(async () => {
    jest.resetModules();
    const module = await import('../errorHandler.js');
    errorHandler = module.errorHandler;
    AppError = module.AppError;

    req = {};
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
    
    // Silenciamos la consola durante la prueba
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => { jest.restoreAllMocks(); });

  describe("Transformación de Errores", () => {
    it("Debería atrapar errores Zod y retornar código 400 con detalles", async () => {
      const { ZodError } = await import('zod');
      const err = new ZodError([{ message: "Requerido", path: ["nombre"] }]);
      errorHandler(err, req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ errorCode: "VALIDATION_ERROR" }));
    });

    it("Debería dejar pasar errores creados previamente con AppError", () => {
      const err = new AppError("Sin permisos", 403, "FORBIDDEN_ACTION");
      errorHandler(err, req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("Debería atrapar fallo de sintaxis y retornar 400 seguro", () => {
      const err = new SyntaxError("Unexpected string in JSON");
      err.status = 400;
      err.body = "{ bad: json }";
      errorHandler(err, req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ errorCode: "BAD_JSON_FORMAT" }));
    });

    it("Debería atrapar URIs mal formadas y retornar error 400", () => {
      const err = new URIError("URI malformed");
      errorHandler(err, req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ errorCode: "MALFORMED_URI" }));
    });

    it("Debería bloquear cargas excesivas con error 413", () => {
      const err = new Error("Too large");
      err.type = "entity.too.large";
      errorHandler(err, req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(413);
    });

    it("Debería retornar error 503 si la base de datos se apaga abruptamente", () => {
      const err = new Error("Connection refused");
      err.code = "ECONNREFUSED";
      errorHandler(err, req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ errorCode: "SERVICE_UNAVAILABLE" }));
    });

    it("Debería retornar error 500 genérico si ocurre un fallo no manejado", () => {
      const err = new Error("Caída de conexión");
      errorHandler(err, req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe("Traducción de Errores de Base de Datos", () => {
    const dbErrors = [
      ["23505", 400, "DB_DUPLICATE_RECORD"],
      ["23503", 400, "DB_FOREIGN_KEY_VIOLATION"],
      ["23502", 400, "DB_MISSING_DATA"],
      ["22P02", 400, "DB_INVALID_FORMAT"]
    ];

    it.each(dbErrors)("Should translate Postgres code %s to an error %s with code %s", (code, expectedStatus, expectedCode) => {
      const err = new Error("DB Error");
      err.code = code;
      errorHandler(err, req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(expectedStatus);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ errorCode: expectedCode }));
    });
  });

  describe("Comportamiento de Consola", () => {
    it("Debería imprimir errores en consola solo si no está en modo test", () => {
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
