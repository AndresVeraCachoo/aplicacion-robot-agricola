import { createUserSchema } from '../userSchema.js';

describe("📋 Esquema de Usuario (userSchema)", () => {
  it("✅ Debería validar un usuario correcto", () => {
    const data = { body: { name: "Test", role: "admin", password: "password123" } };
    expect(() => createUserSchema.parse(data)).not.toThrow();
  });

  it("❌ Debería rechazar si el rol no es válido (enum)", () => {
    const data = { body: { name: "Test", role: "inventado", password: "password123" } };
    const result = createUserSchema.safeParse(data);
    
    expect(result.success).toBe(false);
    expect(result.error.issues[0].path).toContain("role");
  });

  it("❌ Debería rechazar contraseñas de menos de 6 caracteres", () => {
    const data = { body: { name: "Test", role: "admin", password: "123" } };
    const result = createUserSchema.safeParse(data);
    
    expect(result.success).toBe(false);
    expect(result.error.issues[0].path).toContain("password");
  });
});