import request from "supertest";
import bcrypt from "bcrypt";
import { app } from "../../src/index.js";
import { pool } from "../../src/config/db.js";

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
    it("debería iniciar sesión correctamente y retornar token JWT y cookies", async () => {
      const response = await request(app).post("/api/auth/login").send({
        name: testUser.name,
        password: testUser.password,
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("accessToken");
      expect(response.headers["set-cookie"]).toBeDefined();
      const cookies = response.headers["set-cookie"];
      expect(cookies.some((c) => c.includes("accessToken="))).toBe(true);
      expect(cookies.some((c) => c.includes("refreshToken="))).toBe(true);

      // Extraemos accessToken cookie (el valor) para pruebas manuales si hiciera falta
      validToken = cookies.find((c) => c.startsWith("accessToken=")).split(";")[0];
    });

    it("debería retornar error 400 si faltan credenciales requeridas", async () => {
      const response = await request(app).post("/api/auth/login").send({
        name: testUser.name,
      });
      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/Errores de validación/i);
    });

    it("debería denegar acceso (401) si el usuario no existe", async () => {
      const response = await request(app).post("/api/auth/login").send({
        name: "UsuarioFantasma",
        password: "123456",
      });
      expect(response.status).toBe(401);
    });

    it("debería denegar acceso (401) si la contraseña es incorrecta", async () => {
      const response = await request(app).post("/api/auth/login").send({
        name: testUser.name,
        password: "PasswordMala",
      });
      expect(response.status).toBe(401);
    });

    it("debería retornar error 429 al exceder límite de intentos de login", async () => {
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
    it("debería validar acceso y retornar estado 200 con token válido", async () => {
      const response = await request(app)
        .get("/api/auth/verify")
        .set("Cookie", validToken);

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(true); 
    });

    it("debería denegar acceso (401) si no se provee token", async () => {
      const response = await request(app).get("/api/auth/verify");
      expect(response.status).toBe(401);
    });

    it("debería denegar acceso (403) si el token es inválido o expiró", async () => {
      const response = await request(app)
        .get("/api/auth/verify")
        .set("Cookie", "accessToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.FALSO.FALSO");
      expect(response.status).toBe(403);
    });
  });

  describe("POST /api/auth/refresh", () => {
    it("debería retornar 401 si no hay refresh token en la cookie", async () => {
      const response = await request(app).post("/api/auth/refresh");
      expect(response.status).toBe(401);
    });
  });

  describe("Interceptor Global 404", () => {
    it("debería atrapar rutas inexistentes y retornar error 404", async () => {
      const response = await request(app).get("/api/ruta-inventada-que-no-existe");
      
      expect(response.status).toBe(404);
      expect(response.body.error).toMatch(/no existe en este servidor/i);
    });
  });
});
