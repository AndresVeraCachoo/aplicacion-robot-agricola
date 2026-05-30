import { jest } from '@jest/globals';
import { validate } from '../validateRequest.js';

describe("Middleware de Validación (validateRequest)", () => {
  it("Debería invocar next() sin errores si el cuerpo de la petición cumple el esquema", () => {
    const mockSchema = { parse: jest.fn() };
    const req = { body: { name: "test" }, params: undefined, query: undefined };
    const res = {};
    const next = jest.fn();

    const middleware = validate(mockSchema);
    middleware(req, res, next);

    expect(mockSchema.parse).toHaveBeenCalledWith({
      body: req.body,
      params: req.params,
      query: req.query
    });
    expect(next).toHaveBeenCalledWith();
  });

  it("Debería derivar el error mediante next(error) si Zod rechaza los datos analizados", () => {
    const errorSimulado = new Error("ZodError");
    const mockSchema = { parse: jest.fn(() => { throw errorSimulado; }) };
    const req = { body: {}, params: undefined, query: undefined };
    const res = {};
    const next = jest.fn();

    const middleware = validate(mockSchema);
    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith(errorSimulado);
  });
});