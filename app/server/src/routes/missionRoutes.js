import { Router } from "express";
import {
  getMisiones, createMision, updateMision, deleteMision,
  getEjecuciones, iniciarEjecucion, updateEjecucion
} from "../controllers/missionController.js";

const router = Router();

router.get("/", getMisiones);
router.post("/", createMision);
router.put("/:id", updateMision);
router.delete("/:id", deleteMision);
router.get("/:id/runs", getEjecuciones);
router.post("/:id/runs", iniciarEjecucion);
router.put("/runs/:run_id", updateEjecucion);

export default router;