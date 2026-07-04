// Intercepción de los flujos estándar de salida para evitar el ruido en la consola del CI/CD 
// provocado por los logs y errores controlados generados intrínsecamente durante los tests.
globalThis.console = {
  ...console,
  // Descomentar en caso de requerir un volcado de consola para depuración local
  // log: () => {}, 
  // error: () => {},
  // warn: () => {},
};

import { closeWorker } from './src/workers/emailWorker.js';
import redisClient from './src/config/redis.js';
import { prisma, pool } from './src/config/db.js';

afterAll(async () => {
  try {
    await closeWorker();
    await redisClient.quit();
    await prisma.$disconnect();
    await pool.end();
  } catch (e) {
    // Ignorar errores en el cierre
  }
});