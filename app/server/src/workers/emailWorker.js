import { Queue, Worker } from 'bullmq';
import { env } from '../config/env.js';
import { sendWelcomeEmail, sendSupportTicket } from '../services/emailService.js';
import Redis from 'ioredis';

/**
 * Cliente de Redis dedicado para BullMQ.
 */
const connection = new Redis(env.REDIS_URL, { 
  maxRetriesPerRequest: null,
  retryStrategy(times) {
    // Si estamos en un entorno de pruebas, no reintentamos la conexión indefinidamente
    if (process.env.NODE_ENV === 'test') {
      return null;
    }
    return Math.min(times * 50, 2000);
  }
});

/**
 * Cola de procesamiento de correos electrónicos.
 * Gestiona el encolamiento de tareas asíncronas para no bloquear el hilo principal.
 * @type {Queue}
 */
export const emailQueue = process.env.IS_UNIT_TEST === 'true'
  ? { add: async () => {}, on: () => {}, close: async () => {} }
  : new Queue('emailQueue', { connection });

/**
 * Trabajador en segundo plano que procesa los correos electrónicos de la cola.
 * Maneja tanto correos de bienvenida como tickets de soporte.
 * @type {Worker}
 */
const emailWorker = process.env.IS_UNIT_TEST === 'true'
  ? { on: () => {}, close: async () => {} }
  : new Worker('emailQueue', async (job) => {
  const { type, payload } = job.data;

  if (type === 'WELCOME_EMAIL') {
    const { email, username, tempPassword } = payload;
    await sendWelcomeEmail(email, username, tempPassword);
  } else if (type === 'SUPPORT_TICKET') {
    const { email, issueType, description } = payload;
    await sendSupportTicket(email, issueType, description);
  } else {
    console.warn(`[EmailWorker] Tipo de trabajo desconocido: ${type}`);
  }
}, { connection });

emailWorker.on('failed', (job, err) => {
  if (process.env.NODE_ENV !== 'test') {
    console.error(`[EmailWorker] Fallo en la tarea ${job.id}: ${err.message}`);
  }
});

connection.on('error', (err) => {
  if (process.env.NODE_ENV !== 'test') {
    console.error(`[BullMQ Redis] Error: ${err.message}`);
  }
});

/**
 * Cierra elegantemente el trabajador y la cola (útil para tests y graceful shutdown)
 */
export const closeWorker = async () => {
  await emailWorker.close();
  await emailQueue.close();
  await connection.quit();
};
