import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { RedisContainer } from "@testcontainers/redis";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Inicializa un contenedor Docker de PostgreSQL y Redis, y carga el esquema inicial 
 * antes de ejecutar la suite de pruebas E2E.
 */
const globalSetup = async () => {
  console.log("\n[E2E Setup] Inicializando base de datos de pruebas...");
  
  const container = await new PostgreSqlContainer("postgres:15-alpine").start();
  const redisContainer = await new RedisContainer("redis:7-alpine").start();

  // Guarda la referencia del contenedor para poder detenerlo al finalizar los tests
  globalThis.__POSTGRES_CONTAINER__ = container;
  globalThis.__REDIS_CONTAINER__ = redisContainer;

  // Configura las variables de entorno para que la aplicación apunte a la base de datos temporal
  process.env.DB_HOST = String(container.getHost());
  process.env.DB_PORT = String(container.getPort());
  process.env.DB_NAME = String(container.getDatabase());
  process.env.DB_USER = String(container.getUsername());
  process.env.DB_PASSWORD = String(container.getPassword());
  process.env.JWT_SECRET = "super-secreto-para-tests-e2e";
  process.env.TEST_PASSWORD = "PasswordSegura123"; // NOSONAR
  
  // Configura Redis para las pruebas
  process.env.REDIS_URL = `redis://${redisContainer.getHost()}:${redisContainer.getPort()}`;
  
  // Conexión temporal para ejecutar el script de creación de tablas
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

  console.log("[E2E Setup] Entorno preparado. Iniciando pruebas...\n");
};

export default globalSetup;