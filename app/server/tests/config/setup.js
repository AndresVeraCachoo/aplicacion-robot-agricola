import { pool } from "../../src/config/db.js";

/**
 * Limpia los datos de todas las tablas después de cada prueba 
 * para garantizar un estado inicial predecible en el siguiente test.
 */
afterEach(async () => {
  try {
    await pool.query(`
      TRUNCATE TABLE 
        historial_energia, robot_datos, ejecuciones_mision, 
        misiones, usuarios, robot_estado 
      RESTART IDENTITY CASCADE;
    `);
  } catch (error) {
    console.error("[E2E Error] Fallo al limpiar las tablas de la base de datos:", error);
  }
});

afterAll(async () => {
  await pool.end();
});