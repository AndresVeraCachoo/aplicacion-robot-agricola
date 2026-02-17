// server/index.js
import express from "express";
import cors from "cors";
import { createServer } from "http"; 
import { Server } from "socket.io"; 
import "dotenv/config";

import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import robotRoutes from "./routes/robotRoutes.js";

import { 
  startRobotSimulation, 
  setSimulationZone, 
  clearSimulationZone,
  setRobotMode,
  setManualVelocity,
  setNavigationTarget // Importamos la nueva función
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
  
  socket.on("client:update_zone", (zone) => {
    setSimulationZone(zone);
  });

  socket.on("client:clear_zone", () => {
    clearSimulationZone();
  });

  socket.on("client:set_mode", (mode) => {
    setRobotMode(mode);
    io.emit("robot:mode_changed", mode);
  });

  socket.on("client:manual_move", (velocity) => {
    setManualVelocity(velocity.x, velocity.y);
  });

  // NUEVO: Listener de navegación
  socket.on("client:navigate_to", (coords) => {
    // coords: { lat, lon }
    setNavigationTarget(coords.lat, coords.lon);
    io.emit("robot:mode_changed", "NAVIGATING");
  });

  socket.on("disconnect", () => {
    console.log("❌ Cliente desconectado:", socket.id);
  });
});

httpServer.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  startRobotSimulation(io);
});