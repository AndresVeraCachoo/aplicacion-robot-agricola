import { z } from "zod";

/**
 * Esquema de validación para el inicio de sesión.
 */
export const loginSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, "Username is required"),
    password: z.string().min(6, "Password must be at least 6 characters")
  })
});