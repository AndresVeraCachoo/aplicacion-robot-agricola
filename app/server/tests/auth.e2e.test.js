// app/server/tests/auth.e2e.test.js
import request from "supertest";
import bcrypt from "bcrypt";
import { app } from "../src/index.js";
import { pool } from "../src/config/db.js";

describe("🔌 E2E - Autenticación (Auth)", () => {
  let validToken = ""; // <- Movido dentro del describe (Guía de Estilo)

  const testUser = {
    name: "TestAdmin",
    password: "PasswordSegura123",
    role: "admin",
  };

  beforeEach(async () => {
    const hashedPassword = await bcrypt.hash(testUser.password, 10);
    await pool.query(
      "INSERT INTO usuarios (name, password, role) VALUES ($1, $2, $3)",
      [testUser.name, hashedPassword, testUser.role]
    );
  });

  // =========================================================================
  // ENDPOINT: POST /api/auth/login
  // =========================================================================
  describe("POST /api/auth/login", () => {
    it("✅ Debería iniciar sesión correctamente y devolver un Token JWT", async () => {
      const response = await request(app).post("/api/auth/login").send({
        name: testUser.name,
        password: testUser.password,
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("token");
      validToken = response.body.token; 
    });

    it("❌ ZOD: Debería bloquear (400) si faltan credenciales", async () => {
      const response = await request(app).post("/api/auth/login").send({
        name: testUser.name,
      });
      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/Error de validación/i);
    });

    it("❌ Debería fallar (401) si el usuario no existe", async () => {
      const response = await request(app).post("/api/auth/login").send({
        name: "UsuarioFantasma",
        password: "123456",
      });
      expect(response.status).toBe(401);
    });

    it("❌ Debería fallar (401) si la contraseña es incorrecta", async () => {
      const response = await request(app).post("/api/auth/login").send({
        name: testUser.name,
        password: "PasswordMala",
      });
      expect(response.status).toBe(401);
    });

    it("🛡️ SEGURIDAD: Debería bloquear (429) tras demasiados intentos", async () => {
      let lastResponse;
      for (let i = 0; i < 11; i++) {
        lastResponse = await request(app).post("/api/auth/login").send({
          name: "Hacker",
          password: "123456",
        });
      }
      expect(lastResponse.status).toBe(429);
    });
  });

  // =========================================================================
  // ENDPOINT: GET /api/auth/verify
  // =========================================================================
  describe("GET /api/auth/verify", () => {
    it("✅ Debería permitir el acceso con un Token válido", async () => {
      const response = await request(app)
        .get("/api/auth/verify")
        .set("Authorization", `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(true); 
    });

    it("❌ Debería fallar (401) si no se envía ningún Token", async () => {
      const response = await request(app).get("/api/auth/verify");
      expect(response.status).toBe(401);
    });

    it("❌ Debería fallar (403) si el Token es inválido o inventado", async () => {
      const response = await request(app)
        .get("/api/auth/verify")
        .set("Authorization", "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.FALSO.FALSO");
      expect(response.status).toBe(403);
    });
  });

  // =========================================================================
  // PRUEBA GLOBAL DEL MIDDLEWARE ATRAPALOTODO 404
  // =========================================================================
  describe("🌍 Global - Atrapalotodo 404", () => {
    it("✅ Debería capturar una ruta inexistente y devolver un JSON con error 404", async () => {
      const response = await request(app).get("/api/ruta-inventada-que-no-existe");
      
      expect(response.status).toBe(404);
      expect(response.body.error).toMatch(/no existe en este servidor/i);
    });
  });
});