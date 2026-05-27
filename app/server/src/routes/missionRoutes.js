import { Router } from "express";
import { validate } from "../middlewares/validateRequest.js";
import { 
  createMisionSchema, updateMisionSchema, updateEjecucionSchema 
} from "../schemas/missionSchema.js";
import { 
  getMisiones, createMision, updateMision, deleteMision, 
  getEjecuciones, iniciarEjecucion, updateEjecucion 
} from "../controllers/missionController.js";

const router = Router();

router.get("/", getMisiones);
router.post("/", validate(createMisionSchema), createMision);
router.put("/:id", validate(updateMisionSchema), updateMision);
router.delete("/:id", deleteMision);

router.get("/:id/runs", getEjecuciones);
router.post("/:id/runs", iniciarEjecucion);
router.put("/runs/:run_id", validate(updateEjecucionSchema), updateEjecucion);

export default router;