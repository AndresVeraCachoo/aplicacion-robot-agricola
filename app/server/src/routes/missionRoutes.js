import { Router } from "express";
import { prisma } from "../config/db.js";
import { validate } from "../middlewares/validateRequest.js";
import { 
  createMissionSchema, updateMissionSchema, updateExecutionSchema 
} from "../schemas/missionSchema.js";

import { MissionService } from "../services/missionService.js";
import { MissionController } from "../controllers/missionController.js";

const missionService = new MissionService(prisma);
const missionController = new MissionController(missionService);

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Misiones
 *   description: Gestión de misiones de campo y su historial de ejecuciones
*/

/**
 * @swagger
 * /missions/:
 *   get:
 *     summary: Lista todas las misiones registradas
 *     tags: [Misiones]
 *     responses:
 *       200:
 *         description: Array de misiones devuelto con éxito.
*/
router.get("/", missionController.getMissions);

/**
 * @swagger
 * /missions/:
 *   post:
 *     summary: Registra una nueva configuración de misión
 *     tags: [Misiones]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - taskType
 *               - workWidth
 *               - passAngle
 *               - minBattery
 *               - workArea
 *             properties:
 *               name:
 *                 type: string
 *                 example: "North Field Fumigation"
 *               taskType:
 *                 type: string
 *                 example: "Fumigation"
 *               workWidth:
 *                 type: number
 *                 example: 12.5
 *               passAngle:
 *                 type: number
 *                 example: 45
 *               minBattery:
 *                 type: number
 *                 example: 20
 *               workArea:
 *                 type: object
 *                 description: Objeto GeoJSON válido
 *                 example:
 *                   {
 *                     "type": "Polygon",
 *                     "coordinates":
 *                       [
 *                         [
 *                           [-3.7, 40.4],
 *                           [-3.6, 40.4],
 *                           [-3.6, 40.5],
 *                           [-3.7, 40.5],
 *                           [-3.7, 40.4],
 *                         ],
 *                       ],
 *                   }
 *               poi:
 *                 type: object
 *                 example: { "type": "FeatureCollection", "features": [] }
 *               returnPoint:
 *                 type: object
 *                 example: { "type": "Point", "coordinates": [-3.65, 40.45] }
 *               scheduledTime:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *                 example: "2026-06-01T08:00:00Z"
 *     responses:
 *       201:
 *         description: Misión creada correctamente.
 *       400:
 *         description: Errores en la validación del esquema geográfico o campos obligatorios faltantes.
*/
router.post("/", validate(createMissionSchema), missionController.createMission);

/**
 * @swagger
 * /missions/{id}:
 *   put:
 *     summary: Actualiza los parámetros de una misión existente
 *     tags: [Misiones]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "South Field Fumigation"
 *               taskType:
 *                 type: string
 *                 example: "Irrigation"
 *               workWidth:
 *                 type: number
 *                 example: 15.0
 *               passAngle:
 *                 type: number
 *                 example: 90
 *               minBattery:
 *                 type: number
 *                 example: 30
 *               workArea:
 *                 type: object
 *                 example:
 *                   {
 *                     "type": "Polygon",
 *                     "coordinates":
 *                       [
 *                         [
 *                           [-3.7, 40.4],
 *                           [-3.6, 40.4],
 *                           [-3.6, 40.5],
 *                           [-3.7, 40.5],
 *                           [-3.7, 40.4],
 *                         ],
 *                       ],
 *                   }
 *     responses:
 *       200:
 *         description: Misión actualizada correctamente.
 *       404:
 *         description: La misión especificada no existe.
*/
router.put("/:id", validate(updateMissionSchema), missionController.updateMission);

/**
 * @swagger
 * /missions/{id}:
 *   delete:
 *     summary: Elimina una misión y sus ejecuciones asociadas
 *     tags: [Misiones]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *     responses:
 *       200:
 *         description: Misión eliminada correctamente.
 *       404:
 *         description: La misión no existe.
*/
router.delete("/:id", missionController.deleteMission);

/**
 * @swagger
 * /missions/{id}/runs:
 *   get:
 *     summary: Devuelve el historial de ejecuciones de una misión
 *     tags: [Misiones]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *     responses:
 *       200:
 *         description: Ejecuciones devueltas correctamente.
*/
router.get("/:id/runs", missionController.getExecutions);

/**
 * @swagger
 * /missions/{id}/runs:
 *   post:
 *     summary: Inicia una nueva ejecución para una misión específica
 *     tags: [Misiones]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *     responses:
 *       201:
 *         description: Ejecución iniciada correctamente.
 *       400:
 *         description: La misión no es apta para ser ejecutada.
*/
router.post("/:id/runs", missionController.startExecution);

/**
 * @swagger
 * /missions/runs/{run_id}:
 *   put:
 *     summary: Actualiza el estado o la fecha de finalización de una ejecución
 *     tags: [Misiones]
 *     parameters:
 *       - in: path
 *         name: run_id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 10
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [in_progress, completed, cancelled, paused]
 *                 example: "completed"
 *               progress:
 *                 type: number
 *                 example: 100
 *               batteryUsed:
 *                 type: number
 *                 example: 45.5
 *               distanceCovered:
 *                 type: number
 *                 example: 1250.5
 *               timeElapsed:
 *                 type: number
 *                 example: 3600
 *               endTime:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-05-29T10:00:00Z"
 *     responses:
 *       200:
 *         description: Ejecución actualizada correctamente.
 *       404:
 *         description: La ejecución especificada no existe.
*/
router.put("/runs/:run_id", validate(updateExecutionSchema), missionController.updateExecution);

export default router;