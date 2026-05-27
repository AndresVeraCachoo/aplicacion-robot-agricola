import { z } from "zod";

export const loginSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, "El nombre de usuario es obligatorio"),
    password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres")
  })
});