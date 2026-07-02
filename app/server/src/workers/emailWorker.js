import { Queue, Worker } from 'bullmq';
import { env } from '../config/env.js';
import { sendWelcomeEmail, sendSupportTicket } from '../services/emailService.js';

/**
 * Configuración de conexión para Redis.
 * @type {Object}
 */
const connection = {
  url: env.REDIS_URL,
};

/**
 * Cola de procesamiento de correos electrónicos.
 * Gestiona el encolamiento de tareas asíncronas para no bloquear el hilo principal.
 * @type {Queue}
 */
export const emailQueue = new Queue('emailQueue', { connection });

/**
 * Trabajador en segundo plano que procesa los correos electrónicos de la cola.
 * Maneja tanto correos de bienvenida como tickets de soporte.
 * @type {Worker}
 */
const emailWorker = new Worker('emailQueue', async (job) => {
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
  console.error(`[EmailWorker] Fallo en la tarea ${job.id}: ${err.message}`);
});

export default emailWorker;
