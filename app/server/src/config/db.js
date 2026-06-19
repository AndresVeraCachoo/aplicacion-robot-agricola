/**

 * @description Configuración central de la conexión a la base de datos PostgreSQL utilizando Prisma ORM.
 */

import { env } from "./env.js";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/index.js";

/**
 * Pool de conexiones de PostgreSQL configurado con la URL del entorno.
 * @type {pg.Pool}
 */
export const pool = new pg.Pool({ connectionString: env.DATABASE_URL });
const adapter = new PrismaPg(pool);

/**
 * Instancia global del cliente Prisma para interactuar con la base de datos.
 * @type {PrismaClient}
 */
export const prisma = new PrismaClient({ adapter, log: ["error"] });