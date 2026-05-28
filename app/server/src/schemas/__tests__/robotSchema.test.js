import { getDatosSchema } from '../robotSchema.js';

describe("📋 Esquema de Robot (robotSchema)", () => {
  it("✅ Debería validar si start y end están presentes con ISO 8601", () => {
    const data = { query: { start: "2023-01-01T00:00:00Z", end: "2023-01-02T00:00:00Z" } };
    expect(() => getDatosSchema.parse(data)).not.toThrow();
  });

  it("❌ Debería fallar el 'refine' si solo se envía 'start' y no 'end'", () => {
    const data = { query: { start: "2023-01-01T00:00:00Z" } };
    const result = getDatosSchema.safeParse(data);
    
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toMatch(/ambas fechas/);
  });
});