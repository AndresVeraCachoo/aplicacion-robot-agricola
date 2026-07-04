import request from "supertest";
import { app } from "../../src/index.js";
import { pool } from "../../src/config/db.js";

describe("E2E - Misiones y Ejecuciones", () => {
  let seedMissionId;
  let seedRunId;

  const newMissionPayload = {
    name: "Exploración Sector Sur",
    taskType: "mapeo",
    workWidth: 10.5,
    passAngle: 0,
    minBattery: 15,
    workArea: { type: "Polygon", coordinates: [[[40.1, -3.1]]] }, 
    poi: [],
    returnPoint: { lat: 40, lng: -3 },
    scheduledTime: new Date().toISOString(),
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
    it("debería crear una nueva misión y retornar estado 201", async () => {
      const response = await request(app)
        .post("/api/missions")
        .send(newMissionPayload);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("id");
      expect(response.body.name).toBe(newMissionPayload.name);
    });

    it("debería retornar error 400 si faltan campos en la carga útil", async () => {
      const response = await request(app)
        .post("/api/missions")
        .send({ name: "Misión Incompleta" });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Errores de validación en los datos.");
    });

    it("debería retornar error 400 si la batería mínima excede el valor", async () => {
      const response = await request(app)
        .post("/api/missions")
        .send({ ...newMissionPayload, minBattery: 150 }); 

      expect(response.status).toBe(400);
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ message: "validation.mission.battery_range" })
        ])
      );
    });
  });

  describe("GET /api/missions", () => {
    it("debería retornar la lista de todas las misiones registradas", async () => {
      const response = await request(app).get("/api/missions");
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe("PUT /api/missions/:id", () => {
    it("debería actualizar los parámetros de una misión existente", async () => {
      const response = await request(app)
        .put(`/api/missions/${seedMissionId}`)
        .send({ name: "Misión Semilla Editada", workWidth: 5 });

      expect(response.status).toBe(200);
      const dbCheck = await pool.query("SELECT nombre, ancho_trabajo FROM misiones WHERE id = $1", [seedMissionId]);
      expect(dbCheck.rows[0].nombre).toBe("Misión Semilla Editada");
    });
  });

  describe("DELETE /api/missions/:id", () => {
    it("debería eliminar la misión y sus ejecuciones asociadas", async () => {
      const response = await request(app).delete(`/api/missions/${seedMissionId}`);
      expect(response.status).toBe(200);
    });
  });

  describe("POST /api/missions/:id/runs", () => {
    it("debería registrar el inicio de una nueva ejecución para la misión", async () => {
      const response = await request(app).post(`/api/missions/${seedMissionId}/runs`);
      expect(response.status).toBe(201);
    });
  });

  describe("GET /api/missions/:id/runs", () => {
    it("debería retornar el historial de ejecución correspondiente", async () => {
      const response = await request(app).get(`/api/missions/${seedMissionId}/runs`);
      expect(response.status).toBe(200);
    });
  });

  describe("PUT /api/missions/runs/:run_id", () => {
    it("debería actualizar el progreso y telemetría de la ejecución", async () => {
      const updateData = {
        status: "completed",
        batteryUsed: 45,
        distanceCovered: 120.5,
        progress: 100
      };

      const response = await request(app)
        .put(`/api/missions/runs/${seedRunId}`)
        .send(updateData);

      expect(response.status).toBe(200);
    });
  });
});
