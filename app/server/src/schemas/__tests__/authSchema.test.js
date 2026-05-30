import { loginSchema } from '../authSchema.js';

describe("Esquema de Autenticación (authSchema)", () => {
  it("Debería validar credenciales con el formato correcto", () => {
    const data = { body: { name: "admin_master", password: "password123" } };
    expect(() => loginSchema.parse(data)).not.toThrow();
  });

  it("Debería rechazar si el nombre está vacío", () => {
    const data = { body: { name: "   ", password: "password123" } };
    const result = loginSchema.safeParse(data);
    
    expect(result.success).toBe(false);
    expect(result.error.issues[0].path).toContain("name");
  });

  it("Debería rechazar si la contraseña es menor de 6 caracteres", () => {
    const data = { body: { name: "admin", password: "123" } };
    const result = loginSchema.safeParse(data);
    
    expect(result.success).toBe(false);
    expect(result.error.issues[0].path).toContain("password");
  });
});