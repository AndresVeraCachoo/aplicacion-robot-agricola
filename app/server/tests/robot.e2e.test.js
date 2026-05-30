import request from "supertest";
import jwt from "jsonwebtoken";
import { app } from "../src/index.js";
import { pool } from "../src/config/db.js";

describe("E2E - Telemetría y Estado del Robot (Robot)", () => {
  let validToken;
  let misionId;

  const API_ESTADO = "/api/robot/estado";
  const API_DATOS = "/api/robot/datos";
  const API_ENERGIA = "/api/robot/energia/historial";

  const fechaAntigua = new Date("2023-01-01T10:00:00Z");
  const fechaReciente = new Date("2025-01-01T10:00:00Z");

  const getWithAuth = (endpoint) => request(app).get(endpoint).set("Authorization", `Bearer ${validToken}`);

  beforeEach(async () => {
    const resUser = await pool.query(
      "INSERT INTO usuarios (name, password, role) VALUES ('TechUser', 'hash', 'operador') RETURNING id"
    );
    validToken = jwt.sign({ id: resUser.rows[0].id, role: 'operador' }, process.env.JWT_SECRET);

    await pool.query(
      "INSERT INTO robot_estado (id, system_status, battery_percentage, current_lat, current_lon) VALUES (1, 'inactivo', 100, 40.0, -3.0)"
    );

    const resMision = await pool.query(
      "INSERT INTO misiones (nombre, tipo_tarea, ancho_trabajo, angulo_pasada, bateria_minima, area_trabajo) VALUES ('Mision Robot', 'mapeo', 2, 90, 20, '[]') RETURNING id"
    );
    misionId = resMision.rows[0].id;

    const resEjecucion = await pool.query(
      "INSERT INTO ejecuciones_mision (mision_id, estado, fecha_inicio, fecha_fin) VALUES ($1, 'completado', $2, $3) RETURNING id",
      [misionId, "2025-01-01T09:00:00Z", "2025-01-01T11:00:00Z"] 
    );
    const ejecucionId = resEjecucion.rows[0].id;

    await pool.query(
      `INSERT INTO robot_datos (ejecucion_id, lat, lon, "timestamp", humedad) VALUES 
      (NULL, 40.1, -3.1, $1, 40), 
      ($3, 40.2, -3.2, $2, 60)`,
      [fechaAntigua.toISOString(), fechaReciente.toISOString(), ejecucionId]
    );

    await pool.query(
      `INSERT INTO historial_energia ("timestamp", bateria_porcentaje, estado) VALUES 
      ($1, 80, 'activo'), 
      ($2, 50, 'activo')`,
      [fechaAntigua.toISOString(), fechaReciente.toISOString()]
    );
  });

  describe("GET /api/robot/estado", () => {
    it("Debería devolver el estado actual de los sistemas del robot", async () => {
      const response = await getWithAuth(API_ESTADO);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("system_status", "inactivo");
      expect(response.body).toHaveProperty("battery_percentage", 100);
    });

    it("Debería devolver error 404 si el registro del estado general no se encuentra", async () => {
      await pool.query("DELETE FROM robot_estado WHERE id = 1");
      const response = await getWithAuth(API_ESTADO);

      expect(response.status).toBe(404);
      expect(response.body.error).toMatch(/no encontrado/i);
    });
  });

  describe("GET /api/robot/datos", () => {
    it("Debería devolver todos los datos agronómicos si no se aplican filtros", async () => {
      const response = await getWithAuth(API_DATOS);
      expect(response.status).toBe(200);
      expect(response.body.length).toBe(2); 
    });

    it("Debería filtrar los datos agronómicos por rango de fechas", async () => {
      const response = await getWithAuth(API_DATOS).query({ 
        start: "2024-01-01T00:00:00Z", 
        end: "2026-01-01T00:00:00Z" 
      });

      expect(response.status).toBe(200);
      expect(response.body.length).toBe(1); 
      expect(Number(response.body[0].humedad)).toBe(60);
    });

    it("Debería filtrar los datos agronómicos por el identificador de la misión", async () => {
      const response = await getWithAuth(API_DATOS).query({ misionId });

      expect(response.status).toBe(200);
      expect(response.body.length).toBe(1); 
      expect(response.body[0].mision_id).toBe(misionId);
    });

    it("Debería devolver error 400 si se proporciona una fecha de inicio sin fecha de fin", async () => {
      const response = await getWithAuth(API_DATOS).query({ 
        start: "2024-01-01T00:00:00Z" 
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/ambas fechas/i);
    });
  });

  describe("GET /api/robot/energia/historial", () => {
    it("Debería devolver el historial de energía completo sin filtros", async () => {
      const response = await getWithAuth(API_ENERGIA);
      expect(response.status).toBe(200);
      expect(response.body.length).toBe(2);
    });

    it("Debería filtrar el historial de energía por rango de fechas", async () => {
      const response = await getWithAuth(API_ENERGIA).query({ 
        start: "2022-01-01T00:00:00Z", 
        end: "2023-12-31T00:00:00Z" 
      });

      expect(response.status).toBe(200);
      expect(response.body.length).toBe(1); 
      expect(Number(response.body[0].bateria_porcentaje)).toBe(80);
    });

    it("Debería filtrar el historial de energía correspondiente a una misión específica", async () => {
      const response = await getWithAuth(API_ENERGIA).query({ misionId });

      expect(response.status).toBe(200);
      expect(response.body.length).toBe(1);
      expect(Number(response.body[0].bateria_porcentaje)).toBe(50); 
    });
  });

  describe("Seguridad del Robot", () => {
    it("Debería devolver error 401 al acceder a los endpoints protegidos sin autenticación", async () => {
      const response = await request(app).get(API_ESTADO); 
      expect(response.status).toBe(401);
    });
  });
});