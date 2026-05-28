import { z } from "zod";

const roleEnum = z.enum(["admin", "operador", "usuario"], {
  invalid_type_error: "Rol inválido. Solo se permite: admin, operador, usuario" 
});

export const createUserSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, "El nombre es obligatorio"),
    role: roleEnum,
    password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres")
  })
});

export const updateUserSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, "El nombre es obligatorio"),
    role: roleEnum,
    password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres").optional()
  })
});

export const updatePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, "La contraseña actual es obligatoria"),
    newPassword: z.string().min(6, "La nueva contraseña debe tener al menos 6 caracteres")
  })
});

export const updateAvatarSchema = z.object({
  body: z.object({
    avatarUrl: z.string().regex(/^https?:\/\/.+/, "Debe ser una URL de imagen válida")
  })
});