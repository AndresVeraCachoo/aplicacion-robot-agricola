import { z } from "zod";

const isoDateValidator = z.string().refine((val) => !Number.isNaN(Date.parse(val)), {
  message: "Debe tener un formato de fecha ISO 8601 válido"
});

/**
 * Esquema integral para la creación de misiones agrícolas.
 */
export const createMisionSchema = z.object({
  body: z.object({
    nombre: z.string().trim().min(1, "El nombre de la misión es obligatorio"),
    tipo_tarea: z.string().trim().min(1, "El tipo de tarea es obligatorio"),
    ancho_trabajo: z.number().positive("El ancho de trabajo debe ser mayor a 0"),
    angulo_pasada: z.number(),
    bateria_minima: z.number().min(0).max(100, "La batería debe estar entre 0 y 100"),
    // Valida la estructura básica como objeto; la validación topológica profunda del GeoJSON la asume la base de datos
    area_trabajo: z.record(z.any(), { message: "El área de trabajo debe ser un objeto GeoJSON válido" }),
    puntos_interes: z.union([z.array(z.any()), z.record(z.any())]).optional(),
    punto_retorno: z.record(z.any()).optional(),
    fecha_programada: isoDateValidator.nullable().optional()
  })
});

/**
 * Esquema para actualización parcial de parámetros de misión.
 */
export const updateMisionSchema = z.object({
  body: z.object({
    nombre: z.string().trim().min(1).optional(),
    tipo_tarea: z.string().trim().min(1).optional(),
    ancho_trabajo: z.number().positive().optional(),
    angulo_pasada: z.number().optional(),
    bateria_minima: z.number().min(0).max(100).optional(),
    area_trabajo: z.record(z.any()).optional()
  })
});

/**
 * Esquema para el registro de estados de ejecución reportados por el hardware del robot.
 */
export const updateEjecucionSchema = z.object({
  body: z.object({
    estado: z.enum(["en_curso", "completado", "cancelado", "pausado"]).optional(),
    progreso: z.number().min(0).max(100).optional(),
    bateria_usada: z.number().min(0).max(100).optional(),
    distancia_recorrida: z.number().nonnegative().optional(),
    tiempo_transcurrido: z.number().nonnegative().optional(),
    fecha_fin: isoDateValidator.optional()
  })
});