// app/server/tests/e2e/setup.js
import { pool } from "../../src/config/db.js";

// DESPUÉS DE CADA TEST: Vaciamos las tablas para el siguiente test
afterEach(async () => {
  try {
    await pool.query(`
      TRUNCATE TABLE 
        historial_energia, robot_datos, ejecuciones_mision, 
        misiones, usuarios, robot_estado 
      RESTART IDENTITY CASCADE;
    `);
  } catch (error) {
    console.error("Error limpiando tablas E2E:", error);
  }
});

// DESPUÉS DE TODOS LOS TESTS DE UN ARCHIVO: Cerramos el cable de conexión local
afterAll(async () => {
  await pool.end();
});