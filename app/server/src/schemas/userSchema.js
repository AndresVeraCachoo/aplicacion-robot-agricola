import { z } from "zod";

// Definición estricta centralizada para evitar desincronizaciones con el ENUM de la base de datos
const roleEnum = z.enum(["admin", "operador", "usuario"], {
  invalid_type_error: "Rol inválido. Solo se permite: admin, operador, usuario" 
});

/**
 * Esquema para la creación de nuevos usuarios desde el panel de administración.
 */
export const createUserSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, "El nombre es obligatorio"),
    role: roleEnum,
    password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres")
  })
});

/**
 * Esquema para la modificación de usuarios existentes.
 */
export const updateUserSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, "El nombre es obligatorio"),
    role: roleEnum,
    // Es opcional porque el administrador puede editar el rol o nombre sin alterar las credenciales
    password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres").optional()
  })
});

/**
 * Esquema para el cambio de credenciales por parte del propio usuario.
 */
export const updatePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, "La contraseña actual es obligatoria"),
    newPassword: z.string().min(6, "La nueva contraseña debe tener al menos 6 caracteres")
  })
});

/**
 * Esquema para la actualización de la imagen de perfil.
 */
export const updateAvatarSchema = z.object({
  body: z.object({
    avatarUrl: z.string().regex(/^https?:\/\/.+/, "Debe ser una URL de imagen válida")
  })
});