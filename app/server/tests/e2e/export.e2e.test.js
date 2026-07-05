import request from "supertest";
import bcrypt from "bcrypt";
import { app } from "../../src/index.js";
import { pool } from "../../src/config/db.js";

describe("E2E - Exportación (Export)", () => {
  let validToken = "";

  const testUser = {
    name: "ExportAdmin",
    password: "PasswordSegura123",
    role: "admin",
    email: "exportadmin@test.com"
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

  describe("POST /api/export/email", () => {
    it("debería retornar 202 y encolar el reporte si el payload es válido", async () => {
      const response = await request(app)
        .post("/api/export/email")
        .set("Cookie", validToken)
        .send({
          fileBase64: "data:application/pdf;base64,JVBERi0xLjQK...",
          filename: "reporte_test.pdf",
          fileType: "application/pdf"
        });

      expect(response.status).toBe(202);
      expect(response.body.message).toMatch(/encolado/i);
    });

    it("debería retornar 400 si faltan datos en el body", async () => {
      const response = await request(app)
        .post("/api/export/email")
        .set("Cookie", validToken)
        .send({
          filename: "solo_nombre.pdf"
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/Errores de validación/i);
    });

    it("debería retornar 401 si no hay token de autenticación", async () => {
      const response = await request(app)
        .post("/api/export/email")
        .send({
          fileBase64: "base64data...",
          filename: "reporte_test.pdf",
          fileType: "application/pdf"
        });

      expect(response.status).toBe(401);
    });

    it("debería retornar 400 si el usuario no tiene correo configurado", async () => {
      const hash = await bcrypt.hash("123456", 10);
      await pool.query(
        "INSERT INTO usuarios (name, password, role, email) VALUES ($1, $2, $3, NULL)",
        ["NoEmailUser", hash, "operador"]
      );
      const loginRes = await request(app).post("/api/auth/login").send({
        name: "NoEmailUser",
        password: "123456",
      });
      const noEmailToken = loginRes.headers["set-cookie"].find((c) => c.startsWith("accessToken=")).split(";")[0];
      
      const response = await request(app)
        .post("/api/export/email")
        .set("Cookie", noEmailToken)
        .send({
          fileBase64: "data:application/pdf;base64,abc...",
          filename: "test.pdf",
          fileType: "application/pdf"
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/correo/i);
    });
  });
});
