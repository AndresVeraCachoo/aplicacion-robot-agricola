import { Router } from "express";
import { pool } from "../config/db.js";
import { authenticateToken, requireAdmin } from "../middlewares/auth.js";
import { validate } from "../middlewares/validateRequest.js";
import { 
  createUserSchema, updateUserSchema, updatePasswordSchema, updateAvatarSchema 
} from "../schemas/userSchema.js";

// Importación de las Clases de la Arquitectura de 3 Capas
import { UserService } from "../services/userService.js";
import { UserController } from "../controllers/userController.js";

// Orquestación e Inyección de Dependencias
const userService = new UserService(pool);
const userController = new UserController(userService);

const router = Router();

router.use(authenticateToken);

router.get("/profile", userController.getProfile);
router.put("/profile/password", validate(updatePasswordSchema), userController.updatePassword);
router.put("/profile/avatar", validate(updateAvatarSchema), userController.updateAvatar); 

router.get("/", requireAdmin, userController.getUsers);
router.post("/", requireAdmin, validate(createUserSchema), userController.createUser);
router.put("/:id", requireAdmin, validate(updateUserSchema), userController.updateUser);
router.delete("/:id", requireAdmin, userController.deleteUser);

export default router;