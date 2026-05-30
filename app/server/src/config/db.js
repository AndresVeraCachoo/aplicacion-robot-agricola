import pg from "pg";

const { Pool } = pg;

/**
 * Pool de conexiones a PostgreSQL.
 * Gestiona múltiples conexiones reutilizables para optimizar el rendimiento y evitar la sobrecarga del handshake en cada petición.
 */
export const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "robot_dashboard_db",
  password: process.env.DB_PASSWORD, 
  port: process.env.DB_PORT || 5432,
});