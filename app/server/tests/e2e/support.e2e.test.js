import request from "supertest";
import bcrypt from "bcrypt";
import { app } from "../../src/index.js";
import { pool } from "../../src/config/db.js";

describe("E2E - Soporte (Support)", () => {
  let validToken = "";

  const testUser = {
    name: "SupportAdmin",
    password: "PasswordSegura123",
    role: "admin",
    email: "supportadmin@test.com"
  };

  beforeAll(async () => {
    const hashedPassword = await bcrypt.hash(testUser.password, 10);
    await pool.query(
      "INSERT INTO usuarios (name, password, role, email) VALUES ($1, $2, $3, $4)",
      [testUser.name, hashedPassword, testUser.role, testUser.email]
    );

    const response = await request(app).post("/api/auth/login").send({
      name: testUser.name,
      password: testUser.password,
    });
    
    const cookies = response.headers["set-cookie"];
    validToken = cookies.find((c) => c.startsWith("accessToken=")).split(";")[0];
  });

  describe("POST /api/support/ticket", () => {
    it("debería retornar 202 al enviar un ticket válido", async () => {
      const response = await request(app)
        .post("/api/support/ticket")
        .set("Cookie", validToken)
        .send({
          type: "app",
          description: "La aplicación no responde al hacer clic en el botón de exportar."
        });

      expect(response.status).toBe(202);
      expect(response.body.message).toMatch(/encolado/i);
    });

    it("debería retornar 400 si el esquema del ticket es inválido", async () => {
      const response = await request(app)
        .post("/api/support/ticket")
        .set("Cookie", validToken)
        .send({
          type: "unknown_type", // Tipo no permitido en el enum
          description: "Corto" // Menos de 5 caracteres
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/Errores de validación/i);
    });

    it("debería retornar 401 si no hay token de autenticación", async () => {
      const response = await request(app)
        .post("/api/support/ticket")
        .send({
          type: "robot",
          description: "El robot no se conecta"
        });

      expect(response.status).toBe(401);
    });

    it("debería usar ADMIN_EMAIL de .env si no hay admins con correo", async () => {
      await pool.query("UPDATE usuarios SET email = NULL WHERE role = 'admin'");
      const originalAdminEmail = process.env.ADMIN_EMAIL;
      process.env.ADMIN_EMAIL = 'fallback@test.com';

      const response = await request(app)
        .post("/api/support/ticket")
        .set("Cookie", validToken)
        .send({
          type: "app",
          description: "Test sin admins reales"
        });

      expect(response.status).toBe(202);
      process.env.ADMIN_EMAIL = originalAdminEmail;
    });
  });
});
