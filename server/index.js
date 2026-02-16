// server/index.js
import express from "express";
import cors from "cors";
import { createServer } from "http"; 
import { Server } from "socket.io"; 
import "dotenv/config";

import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import robotRoutes from "./routes/robotRoutes.js";
// Importamos funciones del simulador, incluyendo las nuevas de control
import { 
  startRobotSimulation, 
  setSimulationZone, 
  clearSimulationZone,
  setRobotMode,
  setManualVelocity
} from "./simulator.js";

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.use("/api", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/robot", robotRoutes);

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173", 
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("🔌 Cliente conectado:", socket.id);
  
  // Eventos de Zona
  socket.on("client:update_zone", (zone) => {
    setSimulationZone(zone);
  });

  socket.on("client:clear_zone", () => {
    clearSimulationZone();
  });

  // --- NUEVOS EVENTOS DE CONTROL ---
  socket.on("client:set_mode", (mode) => {
    // mode: "AUTO" | "MANUAL"
    setRobotMode(mode);
    io.emit("robot:mode_changed", mode); // Notificar a todos los clientes
  });

  socket.on("client:manual_move", (velocity) => {
    // velocity: { x: -1|0|1, y: -1|0|1 }
    setManualVelocity(velocity.x, velocity.y);
  });

  socket.on("disconnect", () => {
    console.log("❌ Cliente desconectado:", socket.id);
  });
});

httpServer.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  startRobotSimulation(io);
});