import { jest } from '@jest/globals';

describe("Middleware Global de Errores (errorHandler)", () => {
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
    it("Debería capturar los errores de Zod y devolver un código 400 con los detalles", async () => {
      const { ZodError } = await import('zod');
      const err = new ZodError([{ message: "Requerido", path: ["nombre"] }]);
      errorHandler(err, req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ errorCode: "VALIDATION_ERROR" }));
    });

    it("Debería dejar pasar directamente los errores que ya hemos creado con AppError", () => {
      const err = new AppError("Sin permisos", 403, "FORBIDDEN_ACTION");
      errorHandler(err, req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("Debería capturar un fallo de sintaxis (JSON roto) y devolver un 400 seguro", () => {
      const err = new SyntaxError("Unexpected string in JSON");
      err.status = 400;
      err.body = "{ bad: json }";
      errorHandler(err, req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ errorCode: "BAD_JSON_FORMAT" }));
    });

    it("Debería capturar enlaces mal formados y devolver un error 400", () => {
      const err = new URIError("URI malformed");
      errorHandler(err, req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ errorCode: "MALFORMED_URI" }));
    });

    it("Debería bloquear las peticiones que pesen demasiado con un error 413", () => {
      const err = new Error("Too large");
      err.type = "entity.too.large";
      errorHandler(err, req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(413);
    });

    it("Debería devolver un error 503 si la base de datos se apaga de golpe", () => {
      const err = new Error("Connection refused");
      err.code = "ECONNREFUSED";
      errorHandler(err, req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ errorCode: "SERVICE_UNAVAILABLE" }));
    });

    it("Debería devolver un error 500 genérico si ocurre un fallo que no tenemos contemplado", () => {
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

    it.each(dbErrors)("Debería traducir el código de Postgres %s a un error %s con código %s", (code, expectedStatus, expectedCode) => {
      const err = new Error("DB Error");
      err.code = code;
      errorHandler(err, req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(expectedStatus);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ errorCode: expectedCode }));
    });
  });

  describe("Comportamiento de la Consola", () => {
    it("Debería imprimir los errores en consola solo si no estamos en entorno de testing", () => {
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