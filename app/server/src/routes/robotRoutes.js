import { Router } from "express";
import { authenticateToken } from "../middlewares/auth.js";
import { getEstadoRobot, getDatosAgronomicos, getHistorialEnergia } from "../controllers/robotController.js";

const router = Router();

const handleAsync = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Error en el servidor" });
  }
};

router.get("/estado", authenticateToken, handleAsync(getEstadoRobot));
router.get("/datos", authenticateToken, handleAsync(getDatosAgronomicos));
router.get("/energia/historial", authenticateToken, handleAsync(getHistorialEnergia));

export default router;