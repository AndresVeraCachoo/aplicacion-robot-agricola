import { Router } from "express";
import { pool } from "../config/db.js";
import { validate } from "../middlewares/validateRequest.js";
import { 
  createMisionSchema, updateMisionSchema, updateEjecucionSchema 
} from "../schemas/missionSchema.js";

// Importación de las Clases de la Arquitectura de 3 Capas
import { MissionService } from "../services/missionService.js";
import { MissionController } from "../controllers/missionController.js";

// Orquestación e Inyección de Dependencias
const missionService = new MissionService(pool);
const missionController = new MissionController(missionService);

const router = Router();

router.get("/", missionController.getMisiones);
router.post("/", validate(createMisionSchema), missionController.createMision);
router.put("/:id", validate(updateMisionSchema), missionController.updateMision);
router.delete("/:id", missionController.deleteMision);

router.get("/:id/runs", missionController.getEjecuciones);
router.post("/:id/runs", missionController.iniciarEjecucion);
router.put("/runs/:run_id", validate(updateEjecucionSchema), missionController.updateEjecucion);

export default router;