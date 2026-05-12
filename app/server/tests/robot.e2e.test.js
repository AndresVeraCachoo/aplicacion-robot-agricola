// app/server/tests/robot.e2e.test.js
import request from "supertest";
import jwt from "jsonwebtoken";
import { app } from "../src/index.js";
import { pool } from "../src/config/db.js";

describe("🤖 E2E - Telemetría y Estado del Robot (Robot)", () => {
  let validToken;
  let misionId;

  // Fechas de prueba precisas para probar los filtros
  const fechaAntigua = new Date("2023-01-01T10:00:00Z");
  const fechaReciente = new Date("2025-01-01T10:00:00Z");

  beforeEach(async () => {
    // 1. Generamos un usuario y un token
    const resUser = await pool.query(
      "INSERT INTO usuarios (name, password, role) VALUES ('TechUser', 'hash', 'operador') RETURNING id"
    );
    validToken = jwt.sign({ id: resUser.rows[0].id, role: 'operador' }, process.env.JWT_SECRET);

    // 2. Insertamos el estado base del Robot (Usando las columnas reales de init.sql)
    await pool.query(
      "INSERT INTO robot_estado (id, system_status, battery_percentage, current_lat, current_lon) VALUES (1, 'inactivo', 100, 40.0, -3.0)"
    );

    // 3. Insertamos una Misión y una Ejecución para vincular los datos
    const resMision = await pool.query(
      "INSERT INTO misiones (nombre, tipo_tarea, ancho_trabajo, angulo_pasada, bateria_minima, area_trabajo) VALUES ('Mision Robot', 'mapeo', 2, 90, 20, '[]') RETURNING id"
    );
    misionId = resMision.rows[0].id;

    const resEjecucion = await pool.query(
      "INSERT INTO ejecuciones_mision (mision_id, estado, fecha_inicio, fecha_fin) VALUES ($1, 'completado', $2, $3) RETURNING id",
      [misionId, "2025-01-01T09:00:00Z", "2025-01-01T11:00:00Z"] 
    );
    const ejecucionId = resEjecucion.rows[0].id;

    // 4. Insertamos Datos Agronómicos
    await pool.query(
      `INSERT INTO robot_datos (ejecucion_id, lat, lon, "timestamp", humedad) VALUES 
      (NULL, 40.1, -3.1, $1, 40), 
      ($3, 40.2, -3.2, $2, 60)`,
      [fechaAntigua.toISOString(), fechaReciente.toISOString(), ejecucionId]
    );

    // 5. Insertamos Historial de Energía (Añadimos 'estado' porque es NOT NULL en tu BD)
    await pool.query(
      `INSERT INTO historial_energia ("timestamp", bateria_porcentaje, estado) VALUES 
      ($1, 80, 'activo'), 
      ($2, 50, 'activo')`,
      [fechaAntigua.toISOString(), fechaReciente.toISOString()]
    );
  });

  // =========================================================================
  // ENDPOINT: GET /api/robot/estado
  // =========================================================================
  describe("GET /api/robot/estado", () => {
    it("✅ Debería devolver el estado actual del robot (200)", async () => {
      const response = await request(app)
        .get("/api/robot/estado")
        .set("Authorization", `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("system_status", "inactivo");
      expect(response.body).toHaveProperty("battery_percentage", 100);
    });

    it("❌ Debería fallar (404) si el registro del robot no existe", async () => {
      await pool.query("DELETE FROM robot_estado WHERE id = 1");

      const response = await request(app)
        .get("/api/robot/estado")
        .set("Authorization", `Bearer ${validToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toMatch(/no encontrado/i);
    });
  });

  // =========================================================================
  // ENDPOINT: GET /api/robot/datos
  // =========================================================================
  describe("GET /api/robot/datos", () => {
    it("✅ Debería devolver todos los datos si no hay filtros (200)", async () => {
      const response = await request(app)
        .get("/api/robot/datos")
        .set("Authorization", `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.length).toBe(2); 
    });

    it("✅ Debería filtrar los datos por rango de fechas (200)", async () => {
      const response = await request(app)
        .get("/api/robot/datos")
        .query({ 
          start: "2024-01-01T00:00:00Z", 
          end: "2026-01-01T00:00:00Z" 
        })
        .set("Authorization", `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.length).toBe(1); 
      expect(Number(response.body[0].humedad)).toBe(60);
    });

    it("✅ Debería filtrar los datos por misionId (200)", async () => {
      const response = await request(app)
        .get("/api/robot/datos")
        .query({ misionId })
        .set("Authorization", `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.length).toBe(1); 
      expect(response.body[0].mision_id).toBe(misionId);
    });
  });

  // =========================================================================
  // ENDPOINT: GET /api/robot/energia/historial
  // =========================================================================
  describe("GET /api/robot/energia/historial", () => {
    it("✅ Debería devolver todo el historial si no hay filtros (200)", async () => {
      const response = await request(app)
        .get("/api/robot/energia/historial")
        .set("Authorization", `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.length).toBe(2);
    });

    it("✅ Debería filtrar el historial por rango de fechas (200)", async () => {
      const response = await request(app)
        .get("/api/robot/energia/historial")
        .query({ 
          start: "2022-01-01T00:00:00Z", 
          end: "2023-12-31T00:00:00Z" 
        })
        .set("Authorization", `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.length).toBe(1); 
      expect(Number(response.body[0].bateria_porcentaje)).toBe(80);
    });

    it("✅ Debería filtrar el historial por misionId usando subconsultas (200)", async () => {
      const response = await request(app)
        .get("/api/robot/energia/historial")
        .query({ misionId })
        .set("Authorization", `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.length).toBe(1);
      expect(Number(response.body[0].bateria_porcentaje)).toBe(50); 
    });
  });

  // =========================================================================
  // PRUEBA DE SEGURIDAD GLOBAL
  // =========================================================================
  it("🛡️ SEGURIDAD: Debería bloquear (401) el acceso a la telemetría sin Token", async () => {
    const response = await request(app).get("/api/robot/estado");
    expect(response.status).toBe(401);
  });
});