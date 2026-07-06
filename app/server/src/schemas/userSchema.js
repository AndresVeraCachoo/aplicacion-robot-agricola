import { z } from "zod";

// Definición centralizada y estricta para evitar desincronizaciones con el ENUM de la base de datos
const roleEnum = z.enum(["admin", "operador", "usuario"], {
  invalid_type_error: "validation.user.invalid_role" 
});

/**
 * Esquema para la creación de nuevos usuarios desde el panel de administración.
 */
export const createUserSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, "validation.user.name_required"),
    role: roleEnum,
    password: z.string().min(6, "validation.auth.password_min_length").optional(), 
    email: z.string().email({ message: "validation.user.invalid_email" }).optional() // NOSONAR
  }).refine((data) => data.password || data.email, {
    message: "validation.user.password_or_email_required",
    path: ["password"]
  })
});

/**
 * Esquema para la modificación de usuarios existentes.
 */
export const updateUserSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, "validation.user.name_required"),
    role: roleEnum,
    email: z.string().email({ message: "validation.user.invalid_email" }).optional(), // NOSONAR
    // Opcional porque el administrador puede editar el rol o nombre sin alterar las credenciales
    password: z.string().min(6, "validation.auth.password_min_length").optional()
  })
});

/**
 * Esquema para el cambio de credenciales por parte del propio usuario.
 */
export const updatePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, "validation.user.current_password_required"),
    newPassword: z.string().min(6, "validation.auth.password_min_length")
  })
});

/**
 * Esquema para la actualización de la foto de perfil.
 */
export const updateAvatarSchema = z.object({
  body: z.object({
    avatarUrl: z.string().regex(/^(\/|https?:\/\/).+/, "validation.user.invalid_avatar_url")
  })
});