import { Router } from "express";
import { pool } from "../config/db.js";
import { authenticateToken } from "../middlewares/auth.js";
import { validate } from "../middlewares/validateRequest.js";
import { getDatosSchema } from "../schemas/robotSchema.js";

// Importación de las Clases de la Arquitectura de 3 Capas
import { RobotService } from "../services/robotService.js";
import { RobotController } from "../controllers/robotController.js";

// Orquestación e Inyección de Dependencias
const robotService = new RobotService(pool);
const robotController = new RobotController(robotService);

const router = Router();

router.get("/estado", authenticateToken, robotController.getEstadoRobot);
router.get("/datos", authenticateToken, validate(getDatosSchema), robotController.getDatosAgronomicos);
router.get("/energia/historial", authenticateToken, validate(getDatosSchema), robotController.getHistorialEnergia);

export default router;