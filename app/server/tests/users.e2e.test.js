import request from "supertest";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { app } from "../src/index.js";
import { pool } from "../src/config/db.js";

describe("E2E - Usuarios y Control de Acceso (Users)", () => {
  let adminToken, operatorToken;
  let adminId, operatorId;

  const testPassword = process.env.TEST_PASSWORD;

  const adminUser = { name: "AdminSupremo", password: testPassword, role: "admin" };
  const operatorUser = { name: "OperadorPerez", password: testPassword, role: "operador" };

  beforeEach(async () => {
    const hash = await bcrypt.hash(testPassword, 10);

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

  describe("Endpoints de Perfil Privado (/api/users/profile)", () => {
    it("Debería devolver los datos del perfil del usuario autenticado omitiendo la contraseña", async () => {
      const response = await request(app)
        .get("/api/users/profile")
        .set("Authorization", `Bearer ${operatorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.name).toBe(operatorUser.name);
      expect(response.body).not.toHaveProperty("password");
    });

    it("Debería actualizar la contraseña si la credencial actual proporcionada es correcta", async () => {
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

    it("Debería devolver error 400 si la contraseña actual proporcionada es incorrecta", async () => {
      const response = await request(app)
        .put("/api/users/profile/password")
        .set("Authorization", `Bearer ${operatorToken}`)
        .send({
          currentPassword: "ContraseñaTotalmenteInventada",
          newPassword: "NuevaPassword456"
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/incorrecta/i);
    });

    it("Debería actualizar la URL de la imagen de perfil del usuario", async () => {
      const response = await request(app)
        .put("/api/users/profile/avatar")
        .set("Authorization", `Bearer ${operatorToken}`)
        .send({ avatarUrl: "https://mi-avatar.com/foto.png" });

      expect(response.status).toBe(200);
    });

    it("Debería devolver error 400 si la URL de la imagen no tiene un formato válido", async () => {
      const response = await request(app)
        .put("/api/users/profile/avatar")
        .set("Authorization", `Bearer ${operatorToken}`)
        .send({ avatarUrl: "esto-no-es-un-enlace" }); 

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/URL de imagen válida/i);
    });
  });

  describe("Endpoints de Administración (/api/users)", () => {
    it("Debería denegar el acceso a la gestión de usuarios si se accede con rol de operador (403)", async () => {
      const response = await request(app)
        .get("/api/users")
        .set("Authorization", `Bearer ${operatorToken}`);

      expect(response.status).toBe(403);
    });

    it("Debería devolver la lista completa de usuarios registrados al acceder con rol de administrador", async () => {
      const response = await request(app)
        .get("/api/users")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(5);
    });

    it("Debería crear un nuevo usuario correctamente", async () => {
      const response = await request(app)
        .post("/api/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "NuevoUsuario",
          password: testPassword,
          role: "operador" 
        });

      expect(response.status).toBe(201);
      expect(response.body.name).toBe("NuevoUsuario");
    });

    it("Debería devolver error 400 si el rol proporcionado no pertenece a las opciones permitidas", async () => {
      const response = await request(app)
        .post("/api/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "HackerMan",
          password: "PasswordSegura123",
          role: "super_dios_del_sistema" 
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/Invalid option/i);
    });

    it("Debería devolver error 409 si se intenta registrar un nombre de usuario que ya existe", async () => {
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

    it("Debería actualizar los datos (nombre o rol) de otro usuario", async () => {
      const response = await request(app)
        .put(`/api/users/${operatorId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "OperadorEditado",
          role: "admin"
        });

      expect(response.status).toBe(200);
    });

    it("Debería eliminar a un usuario estándar del sistema", async () => {
      const response = await request(app)
        .delete(`/api/users/${operatorId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });

    it("Debería impedir la eliminación de los usuarios predeterminados del sistema", async () => {
      const response = await request(app)
        .delete(`/api/users/1`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(409);
    });

    it("Debería impedir la eliminación del último administrador existente", async () => {
      const response = await request(app)
        .delete(`/api/users/${adminId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(409);
    });
  });
});