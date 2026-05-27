import { Router } from "express";
import { authenticateToken } from "../middlewares/auth.js";
import { validate } from "../middlewares/validateRequest.js";
import { getDatosSchema } from "../schemas/robotSchema.js";
import { getEstadoRobot, getDatosAgronomicos, getHistorialEnergia } from "../controllers/robotController.js";

const router = Router();

router.get("/estado", authenticateToken, getEstadoRobot);
router.get("/datos", authenticateToken, validate(getDatosSchema), getDatosAgronomicos);
router.get("/energia/historial", authenticateToken, validate(getDatosSchema), getHistorialEnergia);

export default router;