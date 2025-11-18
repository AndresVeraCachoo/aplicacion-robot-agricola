import pg from "pg";
import "dotenv/config";

const { Pool } = pg;

export const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "robot_dashboard_db",
  // eslint-disable-next-line no-undef
  password: process.env.DB_PASSWORD,
  port: 5432,
});