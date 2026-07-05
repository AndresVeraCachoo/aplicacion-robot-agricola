import { Router } from "express";
import { authenticateToken } from "../middlewares/auth.js";
import { ExportController } from "../controllers/exportController.js";
import { z } from "zod";
import { validate } from "../middlewares/validateRequest.js";

const router = Router();
const exportController = new ExportController();

const exportSchema = z.object({
  body: z.object({
    fileBase64: z.string().min(10, "Base64 string is required"),
    filename: z.string().min(1, "Filename is required"),
    fileType: z.enum(["application/pdf", "text/csv"]),
  })
});

/**
 * @swagger
 * /api/export/email:
 *   post:
 *     summary: Envía un reporte generado por correo al usuario autenticado
 *     tags: [Export]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fileBase64
 *               - filename
 *               - fileType
 *             properties:
 *               fileBase64:
 *                 type: string
 *                 description: Archivo codificado en formato Base64.
 *               filename:
 *                 type: string
 *                 description: Nombre del archivo a adjuntar sin extensión repetida.
 *               fileType:
 *                 type: string
 *                 enum: [application/pdf, text/csv]
 *                 description: Tipo MIME del archivo.
 *     responses:
 *       202:
 *         description: Reporte encolado correctamente para su envío por correo.
 *       400:
 *         description: El usuario no tiene correo configurado o faltan datos.
 *       401:
 *         description: No autorizado (Token faltante o inválido).
 */
router.post("/email", authenticateToken, validate(exportSchema), exportController.emailReport);

export default router;
