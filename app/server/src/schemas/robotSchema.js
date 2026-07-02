import { z } from "zod";

// Validador personalizado para garantizar la compatibilidad estricta con el estándar requerido por PostgreSQL
const isoDateValidator = z.string().refine((val) => !Number.isNaN(Date.parse(val)), {
  message: "validation.robot.invalid_iso_date"
});

/**
 * Esquema de validación para los filtros de búsqueda en datos históricos y telemetría.
 */
export const getDataSchema = z.object({
  query: z.object({
    start: isoDateValidator.optional(),
    end: isoDateValidator.optional(),
    // Permite 'null' o '' porque clientes HTTP como Axios pueden castear variables nulas a strings en la query
    missionId: z.coerce.number().positive("validation.robot.positive_mission_id").optional().or(z.literal('null')).or(z.literal(''))
  }).refine((data) => {
    // Regla de negocio: Garantiza la integridad del rango de tiempo, bloqueando búsquedas abiertas
    return Boolean(data.start) === Boolean(data.end);
  }, { message: "validation.robot.dates_both_or_neither", path: ["start/end"] })
});