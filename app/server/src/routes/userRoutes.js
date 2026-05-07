import { Router } from "express";
import { authenticateToken, requireAdmin } from "../middlewares/auth.js";
import { 
  getProfile, updatePassword, getUsers, createUser, updateUser, deleteUser, updateAvatar 
} from "../controllers/userController.js";

const router = Router();

// Middleware global para estas rutas
router.use(authenticateToken);

// Rutas de perfil
router.get("/profile", getProfile);
router.put("/profile/password", updatePassword);
router.put("/profile/avatar", updateAvatar); 

// Rutas de administración
router.get("/", requireAdmin, getUsers);
router.post("/", requireAdmin, createUser);
router.put("/:id", requireAdmin, updateUser);
router.delete("/:id", requireAdmin, deleteUser);

export default router;