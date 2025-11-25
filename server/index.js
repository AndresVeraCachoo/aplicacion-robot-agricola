import express from "express";
import cors from "cors";
import { createServer } from "http"; 
import { Server } from "socket.io"; 
import "dotenv/config";

import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import robotRoutes from "./routes/robotRoutes.js";
// Importamos las nuevas funciones del simulador
import { startRobotSimulation, setSimulationZone, clearSimulationZone } from "./simulator.js";

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
  
  // --- NUEVOS EVENTOS DE ZONA ---
  socket.on("client:update_zone", (zone) => {
    setSimulationZone(zone);
    // Opcional: Reenviar a otros clientes si quieres sincronización multi-usuario
    // socket.broadcast.emit("robot:zone_updated", zone);
  });

  socket.on("client:clear_zone", () => {
    clearSimulationZone();
  });

  socket.on("disconnect", () => {
    console.log("❌ Cliente desconectado:", socket.id);
  });
});

httpServer.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  startRobotSimulation(io);
});