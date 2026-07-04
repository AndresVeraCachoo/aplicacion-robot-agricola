import { Redis } from "ioredis";
import { env } from "./env.js";

/**
 * Cliente Redis centralizado para uso general (sesiones, caché).
 * @type {Redis}
 */
const redisOptions = process.env.NODE_ENV === 'test' 
  ? { lazyConnect: true, maxRetriesPerRequest: null, retryStrategy: () => null }
  : {};

const redisClient = new Redis(env.REDIS_URL, redisOptions);

redisClient.on("error", (err) => {
  if (process.env.NODE_ENV !== 'test') {
    console.error("[Redis] Error de conexión:", err.message);
  }
});

redisClient.on("connect", () => {
  console.log("[Redis] Conectado exitosamente para caché y sesiones.");
});

export default redisClient;
