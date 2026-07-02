import { z } from "zod";

const isoDateValidator = z.string().refine((val) => !Number.isNaN(Date.parse(val)), {
  message: "validation.robot.invalid_iso_date"
});

/**
 * Esquema completo para la creación de misiones agrícolas.
 */
export const createMissionSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, "validation.mission.name_required"),
    taskType: z.string().trim().min(1, "validation.mission.task_type_required"),
    workWidth: z.number().positive("validation.mission.width_positive"),
    passAngle: z.number(),
    minBattery: z.number().min(0).max(100, "validation.mission.battery_range"),
    // Valida la estructura básica como un objeto; la validación topológica profunda del GeoJSON la asume la base de datos
    workArea: z.record(z.any(), { message: "validation.mission.invalid_geojson" }),
    poi: z.union([z.array(z.any()), z.record(z.any())]).optional(),
    returnPoint: z.record(z.any()).optional(),
    scheduledTime: isoDateValidator.nullable().optional()
  })
});

/**
 * Esquema para la actualización parcial de los parámetros de una misión.
 */
export const updateMissionSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).optional(),
    taskType: z.string().trim().min(1).optional(),
    workWidth: z.number().positive().optional(),
    passAngle: z.number().optional(),
    minBattery: z.number().min(0).max(100).optional(),
    workArea: z.record(z.any()).optional()
  })
});

/**
 * Esquema para el registro de estados de ejecución reportados por el hardware del robot.
 */
export const updateExecutionSchema = z.object({
  body: z.object({
    status: z.enum(["in_progress", "completed", "cancelled", "paused"]).optional(),
    progress: z.number().min(0).max(100).optional(),
    batteryUsed: z.number().min(0).max(100).optional(),
    distanceCovered: z.number().nonnegative().optional(),
    timeElapsed: z.number().nonnegative().optional(),
    endTime: isoDateValidator.optional()
  })
});