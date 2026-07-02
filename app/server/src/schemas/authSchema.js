import { z } from "zod";

/**
 * Esquema de validación para el inicio de sesión.
 */
export const loginSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, "validation.auth.username_required"),
    password: z.string().min(6, "validation.auth.password_min_length")
  })
});