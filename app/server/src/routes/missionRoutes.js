import { Router } from "express";
import { pool } from "../config/db.js";
import { validate } from "../middlewares/validateRequest.js";
import { 
  createMisionSchema, updateMisionSchema, updateEjecucionSchema 
} from "../schemas/missionSchema.js";

import { MissionService } from "../services/missionService.js";
import { MissionController } from "../controllers/missionController.js";

const missionService = new MissionService(pool);
const missionController = new MissionController(missionService);

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Misiones
 *   description: Gestión de misiones de campo y sus ejecuciones
*/

/**
 * @swagger
 * /missions/:
 *   get:
 *     summary: Lista todas las misiones registradas
 *     tags: [Misiones]
 *     responses:
 *       200:
 *         description: Array de misiones devuelto correctamente.
*/
router.get("/", missionController.getMisiones);

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
 *               - nombre
 *               - tipo_tarea
 *               - ancho_trabajo
 *               - angulo_pasada
 *               - bateria_minima
 *               - area_trabajo
 *             properties:
 *               nombre:
 *                 type: string
 *                 example: "Fumigación Campo Norte"
 *               tipo_tarea:
 *                 type: string
 *                 example: "Fumigación"
 *               ancho_trabajo:
 *                 type: number
 *                 example: 12.5
 *               angulo_pasada:
 *                 type: number
 *                 example: 45
 *               bateria_minima:
 *                 type: number
 *                 example: 20
 *               area_trabajo:
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
 *               puntos_interes:
 *                 type: object
 *                 example: { "type": "FeatureCollection", "features": [] }
 *               punto_retorno:
 *                 type: object
 *                 example: { "type": "Point", "coordinates": [-3.65, 40.45] }
 *               fecha_programada:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *                 example: "2026-06-01T08:00:00Z"
 *     responses:
 *       201:
 *         description: Misión creada correctamente.
 *       400:
 *         description: Errores en la validación del esquema geográfico o faltan campos obligatorios.
*/
router.post("/", validate(createMisionSchema), missionController.createMision);

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
 *               nombre:
 *                 type: string
 *                 example: "Fumigación Campo Sur"
 *               tipo_tarea:
 *                 type: string
 *                 example: "Riego"
 *               ancho_trabajo:
 *                 type: number
 *                 example: 15.0
 *               angulo_pasada:
 *                 type: numbe
 *                 example: 90
 *               bateria_minima:
 *                 type: number
 *                 example: 30
 *               area_trabajo:
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
router.put("/:id", validate(updateMisionSchema), missionController.updateMision);

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
router.delete("/:id", missionController.deleteMision);

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

 *         descrption: Ejecuciones devueltas correctamente.
*/
router.get("/:id/runs", missionController.getEjecuciones);

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
router.post("/:id/runs", missionController.iniciarEjecucion);

/**
 * @swagger
 * /missions/runs/{run_id}:
 *   put:
 *     summary: Actualiza el estado o fecha de fin de una ejecución
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
 *               estado:
 *                 type: string
 *                 enum: [en_curso, completado, cancelado, pausado]
 *                 example: "completado"
 *               progreso:
 *                 type: number
 *                 example: 100
 *               bateria_usada:
 *                 type: number
 *                 example: 45.5
 *               distancia_recorrida:
 *                 type: number
 *                 example: 1250.5
 *               tiempo_transcurrido:
 *                 type: number
 *                 example: 3600
 *               fecha_fin:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-05-29T10:00:00Z"
 *     responses:
 *       200:
 *         description: Ejecución actualizada correctamente.
 *       404:
 *         description: La ejecución especificada no existe.
*/
router.put("/runs/:run_id", validate(updateEjecucionSchema), missionController.updateEjecucion);

export default router;