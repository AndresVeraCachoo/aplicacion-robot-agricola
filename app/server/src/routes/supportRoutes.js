import { Router } from "express";
import { prisma } from "../config/db.js";
import { authenticateToken } from "../middlewares/auth.js";
import { SupportController } from "../controllers/supportController.js";
import { z } from "zod";
import { validate } from "../middlewares/validateRequest.js";

const router = Router();
const supportController = new SupportController(prisma);

const ticketSchema = z.object({
  body: z.object({
    type: z.enum(["robot", "app", "password", "other"]),
    description: z.string().min(5, "Description must be at least 5 characters"),
  })
});

router.post("/ticket", authenticateToken, validate(ticketSchema), supportController.createTicket);

export default router;
