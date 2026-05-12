// app/server/tests/missions.e2e.test.js
import request from "supertest";
import { app } from "../src/index.js";
import { pool } from "../src/config/db.js";

describe("🚜 E2E - CRUD de Misiones y Ejecuciones (Missions)", () => {
  let seedMissionId;
  let seedRunId;

  // Payload de prueba para crear misiones
  const newMissionPayload = {
    nombre: "Exploración Sector Sur",
    tipo_tarea: "mapeo",
    ancho_trabajo: 10.5,
    angulo_pasada: 0,
    bateria_minima: 15,
    area_trabajo: [{ lat: 40.1, lng: -3.1 }], // Tu controlador ya lo parsea si es un objeto
    puntos_interes: [],
    punto_retorno: { lat: 40, lng: -3 },
    fecha_programada: new Date().toISOString(),
  };

  // ANTES DE CADA TEST: Insertamos una misión y una ejecución base
  beforeEach(async () => {
    // 1. Misión semilla
    const insertMission = await pool.query(
      `INSERT INTO misiones (nombre, tipo_tarea, ancho_trabajo, angulo_pasada, bateria_minima, area_trabajo) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      ["Misión Semilla", "recoleccion", 2, 90, 20, JSON.stringify([{ lat: 0, lng: 0 }])]
    );
    seedMissionId = insertMission.rows[0].id;

    // 2. Ejecución semilla
    const insertRun = await pool.query(
      `INSERT INTO ejecuciones_mision (mision_id, estado) VALUES ($1, 'pendiente') RETURNING id`,
      [seedMissionId]
    );
    seedRunId = insertRun.rows[0].id;
  });

  // =========================================================================
  // ENDPOINT: POST /api/missions
  // =========================================================================
  describe("1. POST /api/missions", () => {
    it("✅ Debería crear una nueva misión y devolver 201", async () => {
      const response = await request(app)
        .post("/api/missions")
        .send(newMissionPayload);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("id");
      expect(response.body.nombre).toBe(newMissionPayload.nombre);

      // Verificamos en DB
      const dbCheck = await pool.query("SELECT * FROM misiones WHERE id = $1", [response.body.id]);
      expect(dbCheck.rows.length).toBe(1);
    });

    it("❌ Debería fallar (500) si faltan campos obligatorios", async () => {
      const response = await request(app)
        .post("/api/missions")
        .send({ nombre: "Misión Incompleta" });

      expect(response.status).toBe(500);
      expect(response.body.error).toMatch(/null value in column/i);
    });
  });

  // =========================================================================
  // ENDPOINT: GET /api/missions
  // =========================================================================
  describe("2. GET /api/missions", () => {
    it("✅ Debería devolver un array con todas las misiones (200)", async () => {
      const response = await request(app).get("/api/missions");
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(1);
      
      const missionFound = response.body.find(m => m.id === seedMissionId);
      expect(missionFound).toBeDefined();
    });
  });

  // =========================================================================
  // ENDPOINT: PUT /api/missions/:id
  // =========================================================================
  describe("3. PUT /api/missions/:id", () => {
    it("✅ Debería actualizar una misión existente (200)", async () => {
      const response = await request(app)
        .put(`/api/missions/${seedMissionId}`)
        .send({ nombre: "Misión Semilla Editada", ancho_trabajo: 5 });

      expect(response.status).toBe(200);
      
      const dbCheck = await pool.query("SELECT nombre, ancho_trabajo FROM misiones WHERE id = $1", [seedMissionId]);
      expect(dbCheck.rows[0].nombre).toBe("Misión Semilla Editada");
      expect(Number(dbCheck.rows[0].ancho_trabajo)).toBe(5);
    });
  });

  // =========================================================================
  // ENDPOINT: DELETE /api/missions/:id
  // =========================================================================
  describe("4. DELETE /api/missions/:id", () => {
    it("✅ Debería eliminar la misión y sus ejecuciones en cascada (200)", async () => {
      const response = await request(app).delete(`/api/missions/${seedMissionId}`);
      
      expect(response.status).toBe(200);
      
      const missionCheck = await pool.query("SELECT * FROM misiones WHERE id = $1", [seedMissionId]);
      expect(missionCheck.rows.length).toBe(0);

      const runCheck = await pool.query("SELECT * FROM ejecuciones_mision WHERE mision_id = $1", [seedMissionId]);
      expect(runCheck.rows.length).toBe(0);
    });
  });

  // =========================================================================
  // ENDPOINT: POST /api/missions/:id/runs
  // =========================================================================
  describe("5. POST /api/missions/:id/runs", () => {
    it("✅ Debería iniciar una nueva ejecución para la misión (201)", async () => {
      const response = await request(app).post(`/api/missions/${seedMissionId}/runs`);
      
      expect(response.status).toBe(201);
      expect(response.body.mision_id).toBe(seedMissionId);
      expect(response.body.estado).toBe("en_curso");
    });
  });

  // =========================================================================
  // ENDPOINT: GET /api/missions/:id/runs
  // =========================================================================
  describe("6. GET /api/missions/:id/runs", () => {
    it("✅ Debería devolver la lista de ejecuciones de una misión (200)", async () => {
      const response = await request(app).get(`/api/missions/${seedMissionId}/runs`);
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body[0].mision_id).toBe(seedMissionId);
    });
  });

  // =========================================================================
  // ENDPOINT: PUT /api/missions/runs/:run_id
  // =========================================================================
  describe("7. PUT /api/missions/runs/:run_id", () => {
    it("✅ Debería actualizar el progreso de una ejecución (200)", async () => {
      const updateData = {
        estado: "completado",
        bateria_usada: 45,
        distancia_recorrida: 120.5,
        progreso: 100
      };

      const response = await request(app)
        .put(`/api/missions/runs/${seedRunId}`)
        .send(updateData);

      expect(response.status).toBe(200);

      const dbCheck = await pool.query("SELECT estado, bateria_usada, progreso FROM ejecuciones_mision WHERE id = $1", [seedRunId]);
      expect(dbCheck.rows[0].estado).toBe("completado");
      expect(dbCheck.rows[0].bateria_usada).toBe(45);
      expect(dbCheck.rows[0].progreso).toBe(100);
    });
  });
});