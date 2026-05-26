import { Router } from "express";
import { authenticateToken } from "../middlewares/auth.js";
import { getEstadoRobot, getDatosAgronomicos, getHistorialEnergia } from "../controllers/robotController.js";

const router = Router();

router.get("/estado", authenticateToken, getEstadoRobot);
router.get("/datos", authenticateToken, getDatosAgronomicos);
router.get("/energia/historial", authenticateToken, getHistorialEnergia);

export default router;