import http from "node:http";
import express from "express";
import { Server } from "socket.io";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import authRoutes from "./routes/authRoutes.js";
import robotRoutes from "./routes/robotRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import missionRoutes from "./routes/missionRoutes.js";

import { runSeed } from "./scripts/seed.js";
import { AppError, errorHandler } from "./middlewares/errorHandler.js";
import { setupSockets } from "./websockets/socketHandler.js";
import { startRobotSimulation } from "./simulator.js";

// RED DE SEGURIDAD GLOBAL DE NODE.JS (Previene caídas silenciosas)
process.on("uncaughtException", (error) => {
  console.error("💥 [UNCAUGHT EXCEPTION] Error crítico no controlado. Apagando proceso...");
  console.error(error.name, error.message, error.stack);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.error("💥 [UNHANDLED REJECTION] Promesa asíncrona rechazada sin catch. Apagando proceso...");
  console.error(reason);
  process.exit(1);
});

const app = express();
const server = http.createServer(app);

app.set("trust proxy", 1);

// CONFIGURACIÓN DE MIDDLEWARES GLOBALES Y SEGURIDAD
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

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: "Demasiadas peticiones desde esta IP. Inténtelo más tarde." }
});

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      objectSrc: ["'none'"],
      imgSrc: ["'self'", "data:", "blob:", "*"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(cors(corsOptions));
app.use(express.json({ limit: "1mb" }));

// ENRUTAMIENTO (ENDPOINTS DE LA API)
app.use("/api/", apiLimiter);
app.use("/api/auth", authRoutes);
app.use("/api/robot", robotRoutes);
app.use("/api/users", userRoutes);
app.use("/api/missions", missionRoutes);

// ATRAPALOTODO (CATCH-ALL 404): Redirige rutas no existentes al errorHandler
app.all("*", (req, res, next) => {
  next(new AppError(`La ruta ${req.method} ${req.originalUrl} no existe en este servidor.`, 404));
});

// Manejo centralizado de Errores (Única puerta de salida HTTP)
app.use(errorHandler);

// INICIALIZACIÓN DE SERVICIOS (WebSockets, Simulador y Servidor HTTP)
const io = new Server(server, { cors: corsOptions });
setupSockets(io);

if (process.env.NODE_ENV !== "test") {
  startRobotSimulation(io);
}

const PORT = process.env.PORT || 3001;

if (process.env.NODE_ENV !== "test") {
  try {
    await runSeed();
    server.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
  } catch (error) {
    console.error("Arranque de servidor abortado:", error.message);
    process.exit(1);
  }
}

export { app };