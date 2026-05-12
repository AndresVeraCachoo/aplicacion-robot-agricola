// app/server/tests/e2e/globalSetup.js
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const globalSetup = async () => {
  console.log("\n[Global Setup] Levantando contenedor MAESTRO de PostgreSQL...");
  
  // Levantamos un único contenedor
  const container = await new PostgreSqlContainer("postgres:15-alpine").start();

  // Guardamos la referencia oculta para poder destruirlo luego
  globalThis.__POSTGRES_CONTAINER__ = container;

  // Inyectamos las variables al sistema operativo ANTES de que Express despierte
  process.env.DB_HOST = String(container.getHost());
  process.env.DB_PORT = String(container.getPort());
  process.env.DB_NAME = String(container.getDatabase());
  process.env.DB_USER = String(container.getUsername());
  process.env.DB_PASSWORD = String(container.getPassword());
  process.env.JWT_SECRET = "super-secreto-para-tests-e2e";
  process.env.TEST_PASSWORD = "PasswordSegura123"; // NOSONAR

  console.log("[Global Setup] Creando esquema de tablas...");
  
  // Nos conectamos temporalmente solo para inyectar el SQL
  const { Pool } = pg;
  const tempPool = new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  const initSql = fs.readFileSync(path.join(__dirname, '../../../../database/init.sql'), 'utf-8');
  await tempPool.query(initSql);
  await tempPool.end();

  console.log("[Global Setup] Entorno listo. Comenzando la ejecución masiva...\n");
};
export default globalSetup;