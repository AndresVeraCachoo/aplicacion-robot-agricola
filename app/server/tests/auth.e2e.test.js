import request from "supertest";
import bcrypt from "bcrypt";
import { app } from "../src/index.js";
import { pool } from "../src/config/db.js";

describe("E2E - Autenticación (Auth)", () => {
  let validToken = ""; 

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

  describe("POST /api/auth/login", () => {
    it("Debería iniciar sesión correctamente y devolver un Token JWT", async () => {
      const response = await request(app).post("/api/auth/login").send({
        name: testUser.name,
        password: testUser.password,
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("token");
      validToken = response.body.token; 
    });

    it("Debería devolver error 400 si faltan credenciales obligatorias", async () => {
      const response = await request(app).post("/api/auth/login").send({
        name: testUser.name,
      });
      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/Error de validación/i);
    });

    it("Debería denegar el acceso (401) si el usuario especificado no existe", async () => {
      const response = await request(app).post("/api/auth/login").send({
        name: "UsuarioFantasma",
        password: "123456",
      });
      expect(response.status).toBe(401);
    });

    it("Debería denegar el acceso (401) si la contraseña proporcionada es incorrecta", async () => {
      const response = await request(app).post("/api/auth/login").send({
        name: testUser.name,
        password: "PasswordMala",
      });
      expect(response.status).toBe(401);
    });

    it("Debería devolver error 429 al superar el límite de intentos de inicio de sesión permitidos", async () => {
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

  describe("GET /api/auth/verify", () => {
    it("Debería validar el acceso y devolver estado 200 al proporcionar un token válido", async () => {
      const response = await request(app)
        .get("/api/auth/verify")
        .set("Authorization", `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(true); 
    });

    it("Debería denegar el acceso (401) si no se proporciona un token de autorización", async () => {
      const response = await request(app).get("/api/auth/verify");
      expect(response.status).toBe(401);
    });

    it("Debería denegar el acceso (403) si el token proporcionado es inválido o ha expirado", async () => {
      const response = await request(app)
        .get("/api/auth/verify")
        .set("Authorization", "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.FALSO.FALSO");
      expect(response.status).toBe(403);
    });
  });

  describe("Interceptor Global 404", () => {
    it("Debería capturar rutas inexistentes y devolver un error 404 estandarizado", async () => {
      const response = await request(app).get("/api/ruta-inventada-que-no-existe");
      
      expect(response.status).toBe(404);
      expect(response.body.error).toMatch(/no existe en este servidor/i);
    });
  });
});