// server/index.js
import express from "express";
import http from "node:http";
import { Server } from "socket.io";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import robotRoutes from "./routes/robotRoutes.js";
import userRoutes from "./routes/userRoutes.js";
// 1. Importamos la nueva API de misiones
import missionRoutes from "./routes/missionRoutes.js"; 

// Importamos TODAS las funciones del simulador
import { 
    startRobotSimulation, 
    setManualVelocity, 
    setRobotMode, 
    setNavigationTarget, 
    setSimulationZone, 
    clearSimulationZone,
    setEmergencyStop,
    setSpeedLimit,
    queueNavPoint
} from "./simulator.js";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/robot", robotRoutes);
app.use("/api/users", userRoutes);
// 2. Registramos la ruta para que React pueda usarla
app.use("/api/missions", missionRoutes);

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "http://localhost:5173", methods: ["GET", "POST"] },
});

// Iniciar el ciclo del simulador
startRobotSimulation(io);

io.on("connection", (socket) => {
  console.log("Cliente conectado:", socket.id);

  // --- CONTROL BÁSICO ---
  socket.on("client:manual_control", (data) => setManualVelocity(data.x, data.y));
  socket.on("client:change_mode", (mode) => setRobotMode(mode));
  
  // --- NAVEGACIÓN Y COLA ---
  socket.on("client:navigate_to", (target) => setNavigationTarget(target.lat, target.lon, target.clearQueue));
  socket.on("client:queue_point", (point) => queueNavPoint(point));

  // --- SEGURIDAD Y AJUSTES ---
  socket.on("client:emergency_stop", (active) => setEmergencyStop(active));
  socket.on("client:set_speed_limit", (limit) => setSpeedLimit(limit));

  // --- MAPA ---
  socket.on("client:update_zone", (zone) => setSimulationZone(zone));
  socket.on("client:clear_zone", () => clearSimulationZone());

  socket.on("disconnect", () => {
    console.log("Cliente desconectado:", socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});