import { z } from "zod";

// Validador personalizado para asegurar compatibilidad estricta con el estándar exigido por PostgreSQL
const isoDateValidator = z.string().refine((val) => !Number.isNaN(Date.parse(val)), {
  message: "Debe tener un formato de fecha ISO 8601 válido"
});

/**
 * Esquema de validación para filtros de búsqueda en históricos y telemetría.
 */
export const getDatosSchema = z.object({
  query: z.object({
    start: isoDateValidator.optional(),
    end: isoDateValidator.optional(),
    // Se permite 'null' o '' porque clientes HTTP como Axios pueden castear variables nulas a strings en las query strings
    misionId: z.coerce.number().positive("El ID de misión debe ser un número positivo").optional().or(z.literal('null')).or(z.literal(''))
  }).refine((data) => {
    // Regla de negocio: Garantiza la integridad del rango temporal, bloqueando búsquedas de extremo abierto
    return Boolean(data.start) === Boolean(data.end);
  }, { message: "Se deben proporcionar ambas fechas (start y end) o ninguna", path: ["start/end"] })
});