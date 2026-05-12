// app/server/tests/users.e2e.test.js
import request from "supertest";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { app } from "../src/index.js";
import { pool } from "../src/config/db.js";

describe("👥 E2E - CRUD de Usuarios y Perfiles (Users)", () => {
  let adminToken, operatorToken;
  let adminId, operatorId;

  // Usamos la contraseña inyectada en memoria para evitar alertas de SonarQube
  const testPassword = process.env.TEST_PASSWORD;

  const adminUser = { name: "AdminSupremo", password: testPassword, role: "admin" };
  const operatorUser = { name: "OperadorPerez", password: testPassword, role: "operador" };

  beforeEach(async () => {
    const hash = await bcrypt.hash(testPassword, 10);

    // Quemamos los IDs protegidos 1, 2 y 3
    await pool.query(`
      INSERT INTO usuarios (name, password, role) VALUES 
      ('Protegido1', 'hash', 'operador'), 
      ('Protegido2', 'hash', 'operador'), 
      ('Protegido3', 'hash', 'operador')
    `);

    const resAdmin = await pool.query(
      "INSERT INTO usuarios (name, password, role) VALUES ($1, $2, $3) RETURNING id",
      [adminUser.name, hash, adminUser.role]
    );
    adminId = resAdmin.rows[0].id;

    const resOp = await pool.query(
      "INSERT INTO usuarios (name, password, role) VALUES ($1, $2, $3) RETURNING id",
      [operatorUser.name, hash, operatorUser.role]
    );
    operatorId = resOp.rows[0].id;

    adminToken = jwt.sign({ id: adminId, name: adminUser.name, role: adminUser.role }, process.env.JWT_SECRET);
    operatorToken = jwt.sign({ id: operatorId, name: operatorUser.name, role: operatorUser.role }, process.env.JWT_SECRET);
  });

  // =========================================================================
  // SECCIÓN 1: RUTAS DE PERFIL
  // =========================================================================
  describe("Rutas de Mi Perfil (/api/users/profile)", () => {
    it("✅ GET: Debería devolver los datos del usuario logueado (200)", async () => {
      const response = await request(app)
        .get("/api/users/profile")
        .set("Authorization", `Bearer ${operatorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.name).toBe(operatorUser.name);
      expect(response.body).not.toHaveProperty("password");
    });

    it("✅ PUT /password: Debería cambiar la contraseña si la actual es correcta (200)", async () => {
      const response = await request(app)
        .put("/api/users/profile/password")
        .set("Authorization", `Bearer ${operatorToken}`)
        .send({
          currentPassword: testPassword,
          newPassword: "NuevaPassword456"
        });

      expect(response.status).toBe(200);
      const dbCheck = await pool.query("SELECT password FROM usuarios WHERE id = $1", [operatorId]);
      const isMatch = await bcrypt.compare("NuevaPassword456", dbCheck.rows[0].password);
      expect(isMatch).toBe(true);
    });

    it("❌ PUT /password: Debería fallar (400) si la contraseña actual es incorrecta", async () => {
      const response = await request(app)
        .put("/api/users/profile/password")
        .set("Authorization", `Bearer ${operatorToken}`)
        .send({
          currentPassword: "ContraseñaTotalmenteInventada",
          newPassword: "NuevaPassword456"
        });

      // El controlador devuelve 400 cuando la contraseña actual no hace match
      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/incorrecta/i);
    });

    it("✅ PUT /avatar: Debería actualizar el avatar (200)", async () => {
      const response = await request(app)
        .put("/api/users/profile/avatar")
        .set("Authorization", `Bearer ${operatorToken}`)
        .send({ avatarUrl: "https://mi-avatar.com/foto.png" });

      expect(response.status).toBe(200);
    });
  });

  // =========================================================================
  // SECCIÓN 2: RUTAS DE ADMINISTRACIÓN
  // =========================================================================
  describe("Rutas de Administración (/api/users)", () => {
    it("🛡️ SEGURIDAD: Debería bloquear el acceso a un Operador (403)", async () => {
      const response = await request(app)
        .get("/api/users")
        .set("Authorization", `Bearer ${operatorToken}`);

      expect(response.status).toBe(403);
    });

    it("✅ GET: Debería listar todos los usuarios al ser Admin (200)", async () => {
      const response = await request(app)
        .get("/api/users")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(5);
    });

    it("✅ POST: Debería crear un usuario nuevo (201)", async () => {
      const response = await request(app)
        .post("/api/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "NuevoUsuario",
          password: testPassword,
          role: "operador" // Usamos un rol válido para la base de datos
        });

      expect(response.status).toBe(201);
      expect(response.body.name).toBe("NuevoUsuario");
    });

    it("❌ POST: Debería fallar (409) si el nombre de usuario ya existe", async () => {
      const response = await request(app)
        .post("/api/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: adminUser.name,
          password: testPassword,
          role: "operador"
        });

      expect(response.status).toBe(409);
    });

    it("✅ PUT: Debería actualizar los datos de otro usuario (200)", async () => {
      const response = await request(app)
        .put(`/api/users/${operatorId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "OperadorEditado",
          role: "admin"
        });

      expect(response.status).toBe(200);
    });

    it("✅ DELETE: Debería borrar un usuario normal (200)", async () => {
      const response = await request(app)
        .delete(`/api/users/${operatorId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });

    it("❌ DELETE: Debería impedir borrar a los usuarios del sistema 1, 2 o 3 (409)", async () => {
      const response = await request(app)
        .delete(`/api/users/1`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(409);
    });

    it("❌ DELETE: Debería impedir borrar al ÚLTIMO administrador (409)", async () => {
      const response = await request(app)
        .delete(`/api/users/${adminId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(409);
    });
  });
});