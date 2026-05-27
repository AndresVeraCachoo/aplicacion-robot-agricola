import { z } from "zod";
import "dotenv/config";

const envSchema = z.object({
  PORT: z.string().default("3001"),
  DB_USER: z.string({ required_error: "DB_USER es obligatorio en el .env" }),
  DB_PASSWORD: z.string({ required_error: "DB_PASSWORD es obligatorio en el .env" }),
  DB_HOST: z.string().default("localhost"),
  DB_NAME: z.string().default("robot_dashboard_db"),
  DB_PORT: z.string().default("5432"),
  JWT_SECRET: z.string({ required_error: "JWT_SECRET es obligatorio para firmar tokens" }).min(10, "El JWT_SECRET debe ser más largo para ser seguro"),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error("💥 Error fatal: Faltan variables de entorno o son inválidas.");
  console.error(_env.error.format());
  process.exit(1);
}

export const env = _env.data;