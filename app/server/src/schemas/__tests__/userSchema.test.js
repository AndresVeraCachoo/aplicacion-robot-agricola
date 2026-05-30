import { createUserSchema } from '../userSchema.js';

describe("Esquema de Usuario (userSchema)", () => {
  it("Debería validar la creación de un usuario con los datos correctos", () => {
    const data = { body: { name: "Test", role: "admin", password: "password123" } };
    expect(() => createUserSchema.parse(data)).not.toThrow();
  });

  it("Debería rechazar la petición si el rol de usuario no coincide con el enumerado", () => {
    const data = { body: { name: "Test", role: "inventado", password: "password123" } };
    const result = createUserSchema.safeParse(data);
    
    expect(result.success).toBe(false);
    expect(result.error.issues[0].path).toContain("role");
  });

  it("Debería rechazar credenciales de acceso con menos de 6 caracteres", () => {
    const data = { body: { name: "Test", role: "admin", password: "123" } };
    const result = createUserSchema.safeParse(data);
    
    expect(result.success).toBe(false);
    expect(result.error.issues[0].path).toContain("password");
  });
});