import { Router } from "express";
import { pool } from "../config/db.js";
import { authenticateToken } from "../middlewares/auth.js";
import { validate } from "../middlewares/validateRequest.js";
import { getDatosSchema } from "../schemas/robotSchema.js";

import { RobotService } from "../services/robotService.js";
import { RobotController } from "../controllers/robotController.js";

const robotService = new RobotService(pool);
const robotController = new RobotController(robotService);

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Telemetría
 *   description: Consulta del estado en tiempo real e histórico del robot
*/

/**
 * @swagger
 * /robot/estado:
 *   get:
 *     summary: Devuelve el estado actual de los sistemas del robot
 *     tags: [Telemetría]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estado general obtenido correctamente.
 *       401:
 *         description: Sesión inválida o expirada.
 *       404:
 *         description: Estado del robot no encontrado.
*/
router.get("/estado", authenticateToken, robotController.getEstadoRobot);

/**
 * @swagger
 * /robot/datos:
 *   get:
 *     summary: Consulta los datos agronómicos recogidos por los sensores
 *     tags: [Telemetría]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: misionId
 *         schema:
 *           type: integer
 *           example: 1
 *         description: Filtrar registros por el ID de una misión específica
 *       - in: query
 *         name: start
 *         schema:
 *           type: string
 *           format: date-time
 *           example: "2026-05-29T00:00:00.000Z"
 *         description: Fecha inicio (ISO 8601)
 *       - in: query
 *         name: end
 *         schema:
 *           type: string
 *           format: date-time
 *           example: "2026-05-29T23:59:59.999Z"
 *         description: Fecha fin (ISO 8601)
 *     responses:
 *       200:
 *         description: Datos obtenidos correctamente.
 *       400:
 *         description: Formato de fecha incorrecto o faltan parámetros en la query.
*/
router.get("/datos", authenticateToken, validate(getDatosSchema), robotController.getDatosAgronomicos);

/**
 * @swagger
 * /robot/energia/historial:
 *   get:
 *     summary: Consulta el historial de consumo y voltaje de la batería
 *     tags: [Telemetría]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: start
 *         schema:
 *           type: string
 *           format: date-time
 *           example: "2026-05-29T00:00:00.000Z"
 *         description: Fecha inicio (ISO 8601)
 *       - in: query
 *         name: end
 *         schema:
 *           type: string
 *           format: date-time
 *           example: "2026-05-29T23:59:59.999Z"
 *         description: Fecha fin (ISO 8601)
 *       - in: query
 *         name: misionId
 *         schema:
 *           type: integer
 *           example: 1
 *         description: Filtrar registros por el ID de una misión específica
 *     responses:
 *       200:
 *         description: Historial de energía obtenido correctamente.
 *       400:
 *         description: Parámetros de filtrado inválidos.
*/
router.get("/energia/historial", authenticateToken, validate(getDatosSchema), robotController.getHistorialEnergia);

export default router;