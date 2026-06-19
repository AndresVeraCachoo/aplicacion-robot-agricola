import { Router } from "express";
import { prisma } from "../config/db.js";
import { authenticateToken, requireAdmin } from "../middlewares/auth.js";
import { validate } from "../middlewares/validateRequest.js";
import { 
  createUserSchema, updateUserSchema, updatePasswordSchema, updateAvatarSchema 
} from "../schemas/userSchema.js";

import { UserService } from "../services/userService.js";
import { UserController } from "../controllers/userController.js";

const userService = new UserService(prisma);
const userController = new UserController(userService);

const router = Router();

router.use(authenticateToken);

/**
 * @swagger
 * tags:
 *   name: Usuarios
 *   description: Gestión de usuarios, perfiles y permisos del sistema
*/

/**
 * @swagger
 * /users/profile:
 *   get:
 *     summary: Obtiene el perfil del usuario autenticado
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Perfil devuelto correctamente.
 *       401:
 *         description: Sesión inválida o expirada.
 *       404:
 *         description: Usuario no encontrado en la base de datos.
*/
router.get("/profile", userController.getProfile);

/**
 * @swagger
 * /users/profile/password:
 *   put:
 *     summary: Actualiza la contraseña del usuario autenticado
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 example: "password123"
 *               newPassword:
 *                 type: string
 *                 example: "newPassword456"
 *     responses:
 *       200:
 *         description: Contraseña actualizada correctamente.
 *       400:
 *         description: La contraseña actual es incorrecta o el formato es inválido.
*/
router.put("/profile/password", validate(updatePasswordSchema), userController.updatePassword);

/**
 * @swagger
 * /users/profile/avatar:
 *   put:
 *     summary: Actualiza el avatar del usuario autenticado
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - avatarUrl
 *             properties:
 *               avatarUrl:
 *                 type: string
 *                 example: "/avatars/robot-fondo-azul.png"
 *     responses:
 *       200:
 *         description: Avatar actualizado correctamente.
 *       400:
 *         description: URL de avatar inválida.
*/
router.put("/profile/avatar", validate(updateAvatarSchema), userController.updateAvatar); 

/**
 * @swagger
 * /users/:
 *   get:
 *     summary: Lista todos los usuarios del sistema (Sólo administradores)
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de usuarios devuelta correctamente.
 *       403:
 *         description: Permisos insuficientes (requiere rol de administrador).
*/
router.get("/", requireAdmin, userController.getUsers);

/**
 * @swagger
 * /users/:
 *   post:
 *     summary: Crea un nuevo usuario en el sistema (Sólo administradores)
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - role
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 example: "NewOperator"
 *               role:
 *                 type: string
 *                 enum: [admin, operator, user]
 *                 example: "operator"
 *               password:
 *                 type: string
 *                 example: "secret123"
 *     responses:
 *       201:
 *         description: Usuario creado exitosamente.
 *       400:
 *         description: Error de validación de campos.
 *       409:
 *         description: El nombre de usuario ya está en uso.
*/
router.post("/", requireAdmin, validate(createUserSchema), userController.createUser);

/**
 * @swagger
 * /users/{id}:
 *   put:
 *     summary: Modifica los datos de un usuario existente (Sólo administradores)
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 4
 *         description: ID del usuario a modificar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "ModifiedOperator"
 *               role:
 *                 type: string
 *                 enum: [admin, operator, user]
 *                 example: "user"
 *               password:
 *                 type: string
 *                 example: "newPassword123"
 *     responses:
 *       200:
 *         description: Usuario modificado correctamente.
 *       404:
 *         description: El usuario especificado no existe.
*/
router.put("/:id", requireAdmin, validate(updateUserSchema), userController.updateUser);

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Elimina un usuario del sistema (Sólo administradores)
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 4
 *         description: ID del usuario a eliminar
 *     responses:
 *       200:
 *         description: Usuario eliminado exitosamente.
 *       403:
 *         description: Permisos insuficientes.
 *       404:
 *         description: El usuario no existe.
 *       409:
 *         description: Acción denegada (intento de eliminar administradores principales).
*/
router.delete("/:id", requireAdmin, userController.deleteUser);

export default router;