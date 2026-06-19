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

// Previene que el servidor crashee de forma inesperada si hay una promesa sin manejar o error crítico
process.on("uncaughtException", (error) => {
  console.error("[Error Fatal] Excepción no capturada. Deteniendo el proceso para evitar estado corrupto.");
  console.error(error.name, error.message, error.stack);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.error("[Error Fatal] Promesa rechazada no manejada. Deteniendo el proceso.");
  console.error(reason);
  process.exit(1);
});

const app = express();
const server = http.createServer(app);

// Necesario si desplegamos la app en un servidor de producción usando Nginx o balanceadores de carga
app.set("trust proxy", 1);

// Limita quién puede comunicarse con nuestra API (CORS)
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+):\d+$/.test(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Blocked by CORS policy: ${origin}`));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
  optionsSuccessStatus: 200
};

// Previene ataques DDoS limitando la tasa de peticiones
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: "Too many requests from this IP. Please try again later." }
});

// Refuerza las cabeceras HTTP de seguridad
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      objectSrc: ["'none'"],
      // Fuerza a que las imágenes externas (como avatares) carguen a través de enlaces seguros HTTPS
      imgSrc: ["'self'", "data:", "blob:", "https:"], 
    },
  },
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(cors(corsOptions));
// Limita los payloads JSON a 1MB para prevenir agotamiento de memoria
app.use(express.json({ limit: "1mb" }));

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: "AgroSkopos API Docs"
}));

app.use("/api/", apiLimiter);
app.use("/api/auth", authRoutes);
app.use("/api/robot", robotRoutes);
app.use("/api/users", userRoutes);
app.use("/api/missions", missionRoutes);

// Si alguien intenta acceder a una ruta inexistente, devuelve nuestro error 404 estándar
app.all("*", (req, res, next) => {
  next(new AppError(`The route ${req.method} ${req.originalUrl} does not exist on this server.`, 404));
});

app.use(errorHandler);

const io = new Server(server, { cors: corsOptions });
setupSockets(io);

// Detiene el simulador al correr los tests para que el setInterval no se quede colgado en memoria
if (process.env.NODE_ENV !== "test") {
  startRobotSimulation(io);
}

const PORT = process.env.PORT || 3001;

if (process.env.NODE_ENV !== "test") {
  try {
    // Verifica que la base de datos tenga las tablas mínimas y usuarios creados antes de abrir puertos
    await runSeed();
    server.listen(PORT, () => console.log(`[Servidor] Escuchando conexiones en el puerto ${PORT}`));
  } catch (error) {
    console.error("[Servidor] No se pudo iniciar:", error.message);
    process.exit(1);
  }
}

export { app };