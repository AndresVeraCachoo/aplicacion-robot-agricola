/**

 * @description Centraliza, parsea y valida las variables de entorno necesarias para la ejecución segura del servidor.
 */

import { z } from "zod";
import "dotenv/config";

/**
 * Esquema de validación estricta Zod para las variables de entorno.
 * Previene el arranque de la aplicación si faltan credenciales críticas.
 */
const envSchema = z.object({
  PORT: z.string().default("3001"),
  DB_USER: z.string({ required_error: "Falta DB_USER en .env" }),
  DB_PASSWORD: z.string({ required_error: "Falta DB_PASSWORD en .env" }),
  DB_HOST: z.string().default("localhost"),
  DB_NAME: z.string().default("robot_dashboard_db"),
  DB_PORT: z.string().default("5432"),
  JWT_SECRET: z.string({ required_error: "Falta JWT_SECRET para firmar tokens" }).min(10, "JWT_SECRET debe ser más largo para ser seguro"),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error("[Error Config] Faltan variables de entorno o son inválidas. Abortando inicio del servidor.");
  const errores = _env.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`);
  console.error(errores);
  
  process.exit(1);
}

const envData = _env.data;
envData.DATABASE_URL = `postgresql://${envData.DB_USER}:${envData.DB_PASSWORD}@${envData.DB_HOST}:${envData.DB_PORT}/${envData.DB_NAME}?schema=public`;

/**
 * Objeto validado con los valores inyectados por el sistema operativo o el archivo .env.
 */
export const env = envData;