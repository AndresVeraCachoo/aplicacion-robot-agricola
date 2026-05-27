import { Router } from "express";
import { authenticateToken, requireAdmin } from "../middlewares/auth.js";
import { validate } from "../middlewares/validateRequest.js";
import { 
  createUserSchema, updateUserSchema, updatePasswordSchema, updateAvatarSchema 
} from "../schemas/userSchema.js";
import { 
  getProfile, updatePassword, getUsers, createUser, updateUser, deleteUser, updateAvatar 
} from "../controllers/userController.js";

const router = Router();

router.use(authenticateToken);

router.get("/profile", getProfile);
router.put("/profile/password", validate(updatePasswordSchema), updatePassword);
router.put("/profile/avatar", validate(updateAvatarSchema), updateAvatar); 

router.get("/", requireAdmin, getUsers);
router.post("/", requireAdmin, validate(createUserSchema), createUser);
router.put("/:id", requireAdmin, validate(updateUserSchema), updateUser);
router.delete("/:id", requireAdmin, deleteUser);

export default router;