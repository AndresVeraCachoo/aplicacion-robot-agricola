import { getDataSchema } from '../robotSchema.js';

describe("Esquema de Robot", () => {
  it("Debería validar si las fechas de inicio y fin están presentes", () => {
    const data = { query: { start: "2023-01-01T00:00:00Z", end: "2023-01-02T00:00:00Z" } };
    expect(() => getDataSchema.parse(data)).not.toThrow();
  });

  it("Debería fallar si solo se envía la fecha de inicio o fin de forma aislada", () => {
    const data = { query: { start: "2023-01-01T00:00:00Z" } };
    const result = getDataSchema.safeParse(data);
    
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toMatch(/Both dates/);
  });
});
