import request from "supertest";
import { app } from "../src/index.js";
import { pool } from "../src/config/db.js";

describe("E2E - Misiones y Ejecuciones (Missions)", () => {
  let seedMissionId;
  let seedRunId;

  const newMissionPayload = {
    nombre: "Exploración Sector Sur",
    tipo_tarea: "mapeo",
    ancho_trabajo: 10.5,
    angulo_pasada: 0,
    bateria_minima: 15,
    area_trabajo: { type: "Polygon", coordinates: [[[40.1, -3.1]]] }, 
    puntos_interes: [],
    punto_retorno: { lat: 40, lng: -3 },
    fecha_programada: new Date().toISOString(),
  };

  beforeEach(async () => {
    const insertMission = await pool.query(
      `INSERT INTO misiones (nombre, tipo_tarea, ancho_trabajo, angulo_pasada, bateria_minima, area_trabajo) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      ["Misión Semilla", "recoleccion", 2, 90, 20, JSON.stringify({ type: "Polygon" })]
    );
    seedMissionId = insertMission.rows[0].id;

    const insertRun = await pool.query(
      `INSERT INTO ejecuciones_mision (mision_id, estado) VALUES ($1, 'pendiente') RETURNING id`,
      [seedMissionId]
    );
    seedRunId = insertRun.rows[0].id;
  });

  describe("POST /api/missions", () => {
    it("Debería crear una nueva misión y devolver estado 201", async () => {
      const response = await request(app)
        .post("/api/missions")
        .send(newMissionPayload);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("id");
      expect(response.body.nombre).toBe(newMissionPayload.nombre);
    });

    it("Debería devolver error 400 si faltan campos obligatorios en el payload", async () => {
      const response = await request(app)
        .post("/api/missions")
        .send({ nombre: "Misión Incompleta" });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/Error de validación/i);
    });

    it("Debería devolver error 400 si el parámetro de batería mínima excede el valor permitido", async () => {
      const response = await request(app)
        .post("/api/missions")
        .send({ ...newMissionPayload, bateria_minima: 150 }); 

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/estar entre 0 y 100/i);
    });
  });

  describe("GET /api/missions", () => {
    it("Debería devolver la lista de todas las misiones registradas", async () => {
      const response = await request(app).get("/api/missions");
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe("PUT /api/missions/:id", () => {
    it("Debería actualizar los parámetros especificados de una misión existente", async () => {
      const response = await request(app)
        .put(`/api/missions/${seedMissionId}`)
        .send({ nombre: "Misión Semilla Editada", ancho_trabajo: 5 });

      expect(response.status).toBe(200);
      const dbCheck = await pool.query("SELECT nombre, ancho_trabajo FROM misiones WHERE id = $1", [seedMissionId]);
      expect(dbCheck.rows[0].nombre).toBe("Misión Semilla Editada");
    });
  });

  describe("DELETE /api/missions/:id", () => {
    it("Debería eliminar la misión y sus ejecuciones asociadas", async () => {
      const response = await request(app).delete(`/api/missions/${seedMissionId}`);
      expect(response.status).toBe(200);
    });
  });

  describe("POST /api/missions/:id/runs", () => {
    it("Debería registrar el inicio de una nueva ejecución para la misión", async () => {
      const response = await request(app).post(`/api/missions/${seedMissionId}/runs`);
      expect(response.status).toBe(201);
    });
  });

  describe("GET /api/missions/:id/runs", () => {
    it("Debería devolver el historial de ejecuciones correspondiente a una misión", async () => {
      const response = await request(app).get(`/api/missions/${seedMissionId}/runs`);
      expect(response.status).toBe(200);
    });
  });

  describe("PUT /api/missions/runs/:run_id", () => {
    it("Debería actualizar el progreso y los datos telemétricos de una ejecución", async () => {
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
    });
  });
});