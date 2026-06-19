import { z } from "zod";

// Validador personalizado para garantizar la compatibilidad estricta con el estándar requerido por PostgreSQL
const isoDateValidator = z.string().refine((val) => !Number.isNaN(Date.parse(val)), {
  message: "Must have a valid ISO 8601 date format"
});

/**
 * Esquema de validación para los filtros de búsqueda en datos históricos y telemetría.
 */
export const getDataSchema = z.object({
  query: z.object({
    start: isoDateValidator.optional(),
    end: isoDateValidator.optional(),
    // Permite 'null' o '' porque clientes HTTP como Axios pueden castear variables nulas a strings en la query
    missionId: z.coerce.number().positive("Mission ID must be a positive number").optional().or(z.literal('null')).or(z.literal(''))
  }).refine((data) => {
    // Regla de negocio: Garantiza la integridad del rango de tiempo, bloqueando búsquedas abiertas
    return Boolean(data.start) === Boolean(data.end);
  }, { message: "Both dates (start and end) must be provided, or neither", path: ["start/end"] })
});