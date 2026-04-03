// server/index.js
import express from "express";
import http from "node:http";
import { Server } from "socket.io";
import cors from "cors";
import helmet from "helmet";

// Rutas
import authRoutes from "./routes/authRoutes.js";
import robotRoutes from "./routes/robotRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import missionRoutes from "./routes/missionRoutes.js";

// Importar la Semilla Inteligente
import { runSeed } from "./scripts/seed.js";

// Simulador
import {
  startRobotSimulation,
  setSimulationZone,
  clearSimulationZone,
  setRobotMode,
  setManualVelocity,
  setSpeedLimit,
  queueNavPoint,
  setNavigationTarget,
  pauseSimulation,
  resumeSimulation,
  cancelSimulation
} from "./simulator.js";

const app = express();

// <-- AÑADIDO: Crucial para que express-rate-limit vea las IPs reales detrás del proxy de Docker
app.set('trust proxy', 1); 

const server = http.createServer(app);

const allowedOrigins = new Set([
  'http://localhost:5173', 
  'http://localhost:8080', 
  'http://127.0.0.1:5173',
  'http://127.0.0.1:8080'
]);

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Bloqueado por política CORS'));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
  optionsSuccessStatus: 200 
};

const io = new Server(server, {
  cors: corsOptions,
});

app.use(helmet({
  contentSecurityPolicy: false, 
  crossOriginResourcePolicy: { policy: "cross-origin" } 
}));

app.use(cors(corsOptions));

// 1. TAREA CERRADA: LÍMITE DE 1MB (Bomba JSON neutralizada)
app.use(express.json({ limit: "1mb" }));

// Endpoints
app.use("/api/auth", authRoutes);
app.use("/api/robot", robotRoutes);
app.use("/api/users", userRoutes);
app.use("/api/missions", missionRoutes);

// Manejo de WebSockets
io.on("connection", (socket) => {
  console.log("🟢 Cliente conectado:", socket.id);

  socket.on("client:update_zone", (zone) => setSimulationZone(zone));
  socket.on("client:clear_zone", () => clearSimulationZone());
  socket.on("client:change_mode", (mode) => setRobotMode(mode));
  socket.on("client:manual_control", (velocity) => setManualVelocity(velocity.x, velocity.y));
  socket.on("client:set_speed_limit", (limit) => setSpeedLimit(limit));
  socket.on("client:queue_point", (point) => queueNavPoint(point));
  socket.on("client:navigate_to", (data) => setNavigationTarget(data.lat, data.lon, data.clearQueue));
  socket.on("client:pause_mission", () => pauseSimulation());
  socket.on("client:resume_mission", () => resumeSimulation());
  socket.on("client:cancel_mission", () => cancelSimulation());

  socket.on("disconnect", () => {
    console.log("🔴 Cliente desconectado:", socket.id);
  });
});

startRobotSimulation(io);

const PORT = process.env.PORT || 3001;

try {
  await runSeed();
  server.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  });
} catch (err) {
  console.error("❌ Arranque abortado por fallo crítico en la BD:", err.message);
  process.exit(1);
}