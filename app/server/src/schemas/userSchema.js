import { z } from "zod";

// Definición centralizada y estricta para evitar desincronizaciones con el ENUM de la base de datos
const roleEnum = z.enum(["admin", "operador", "usuario"], {
  invalid_type_error: "Invalid role. Only allowed: admin, operador, usuario" 
});

/**
 * Esquema para la creación de nuevos usuarios desde el panel de administración.
 */
export const createUserSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, "Name is required"),
    role: roleEnum,
    password: z.string().min(6, "Password must be at least 6 characters")
  })
});

/**
 * Esquema para la modificación de usuarios existentes.
 */
export const updateUserSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, "Name is required"),
    role: roleEnum,
    // Opcional porque el administrador puede editar el rol o nombre sin alterar las credenciales
    password: z.string().min(6, "Password must be at least 6 characters").optional()
  })
});

/**
 * Esquema para el cambio de credenciales por parte del propio usuario.
 */
export const updatePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(6, "New password must be at least 6 characters")
  })
});

/**
 * Esquema para la actualización de la foto de perfil.
 */
export const updateAvatarSchema = z.object({
  body: z.object({
    avatarUrl: z.string().regex(/^(\/|https?:\/\/).+/, "Must be a valid image URL or local path")
  })
});