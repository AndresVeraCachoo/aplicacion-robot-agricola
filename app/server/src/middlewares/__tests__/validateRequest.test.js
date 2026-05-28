import { jest } from '@jest/globals';
import { validate } from '../validateRequest.js';

describe("🛡️ Middleware de Zod (validateRequest)", () => {
  it("✅ Debería llamar a next() sin errores si el cuerpo es válido", () => {
    const mockSchema = { parse: jest.fn() };
    const req = { body: { name: "test" }, params: undefined, query: undefined };
    const res = {};
    const next = jest.fn();

    const middleware = validate(mockSchema);
    middleware(req, res, next);

    // Ahora esperamos la estructura real que manda el middleware
    expect(mockSchema.parse).toHaveBeenCalledWith({
      body: req.body,
      params: req.params,
      query: req.query
    });
    expect(next).toHaveBeenCalledWith();
  });

  it("❌ Debería llamar a next(error) si Zod rechaza los datos", () => {
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