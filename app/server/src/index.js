import http from "node:http";
import express from "express";
import { Server } from "socket.io";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import swaggerUi from "swagger-ui-express";

import authRoutes from "./routes/authRoutes.js";
import robotRoutes from "./routes/robotRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import missionRoutes from "./routes/missionRoutes.js";

import { runSeed } from "./scripts/seed.js";
import { AppError, errorHandler } from "./middlewares/errorHandler.js";
import { setupSockets } from "./websockets/socketHandler.js";
import { startRobotSimulation } from "./simulator.js";
import { swaggerSpec } from "./config/swagger.js";

// Evitamos que el servidor se apague de golpe si hay una promesa rota o un fallo crítico que se nos haya escapado
process.on("uncaughtException", (error) => {
  console.error("[Fatal Error] Excepción no capturada. Deteniendo el proceso para evitar estado corrupto.");
  console.error(error.name, error.message, error.stack);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.error("[Fatal Error] Promesa rechazada sin manejador Catch. Deteniendo el proceso.");
  console.error(reason);
  process.exit(1);
});

const app = express();
const server = http.createServer(app);

// Necesario si subimos la app a un servidor de producción que utilice Nginx o balanceadores
app.set("trust proxy", 1);

// Limitamos quién puede comunicarse con nuestra API (CORS)
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+):\d+$/.test(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Bloqueado por política CORS: ${origin}`));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
  optionsSuccessStatus: 200
};

// Evitamos que nos tumben el servidor a base de enviar miles de peticiones seguidas (DDoS)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: "Demasiadas peticiones desde esta IP. Inténtelo más tarde." }
});

// Reforzamos las cabeceras HTTP de seguridad
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      objectSrc: ["'none'"],
      // Forzamos que si se cargan imágenes de fuera (como el avatar del usuario), tengan que venir por un enlace seguro HTTPS
      imgSrc: ["'self'", "data:", "blob:", "https:"], 
      upgradeInsecureRequests: [],
    },
  },
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(cors(corsOptions));
// Límite de 1MB en los JSON para que no nos saturen la memoria enviando textos gigantes
app.use(express.json({ limit: "1mb" }));

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: "AgroSkopos API Docs"
}));

app.use("/api/", apiLimiter);
app.use("/api/auth", authRoutes);
app.use("/api/robot", robotRoutes);
app.use("/api/users", userRoutes);
app.use("/api/missions", missionRoutes);

// Si alguien intenta entrar a una ruta que no existe, le mandamos nuestro error 404 estándar
app.all("*", (req, res, next) => {
  next(new AppError(`La ruta ${req.method} ${req.originalUrl} no existe en este servidor.`, 404));
});

app.use(errorHandler);

const io = new Server(server, { cors: corsOptions });
setupSockets(io);

// Apagamos el motor del simulador cuando pasamos los tests para que el setInterval no se quede colgado en memoria
if (process.env.NODE_ENV !== "test") {
  startRobotSimulation(io);
}

const PORT = process.env.PORT || 3001;

if (process.env.NODE_ENV !== "test") {
  try {
    // Comprobamos que la base de datos tenga las tablas y los usuarios mínimos creados antes de abrir puertos
    await runSeed();
    server.listen(PORT, () => console.log(`[Server] Escuchando conexiones en puerto ${PORT}`));
  } catch (error) {
    console.error("[Server] No se pudo arrancar:", error.message);
    process.exit(1);
  }
}

export { app };