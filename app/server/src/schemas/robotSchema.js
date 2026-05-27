import { z } from "zod";

const isoDateValidator = z.string().refine((val) => !Number.isNaN(Date.parse(val)), {
  message: "Debe tener un formato de fecha ISO 8601 válido"
});

export const getDatosSchema = z.object({
  query: z.object({
    start: isoDateValidator.optional(),
    end: isoDateValidator.optional(),
    misionId: z.coerce.number().positive("El ID de misión debe ser un número positivo").optional().or(z.literal('null')).or(z.literal(''))
  }).refine((data) => {
    return Boolean(data.start) === Boolean(data.end);
  }, { message: "Se deben proporcionar ambas fechas (start y end) o ninguna", path: ["start/end"] })
});