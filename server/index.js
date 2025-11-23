import express from "express";
import cors from "cors";
import { createServer } from "http"; // 1. Importar createServer
import { Server } from "socket.io";  // 2. Importar Server de socket.io
import "dotenv/config";

import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import robotRoutes from "./routes/robotRoutes.js";
import { startRobotSimulation } from "./simulator.js";

const app = express();
const PORT = 3001;

// Middlewares
app.use(cors());
app.use(express.json());

// Rutas
app.use("/api", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/robot", robotRoutes);

// 3. Crear servidor HTTP y adjuntar Socket.io
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173", // Ajusta si tu frontend corre en otro puerto
    methods: ["GET", "POST"],
  },
});

// 4. Manejo de conexiones
io.on("connection", (socket) => {
  console.log("🔌 Cliente conectado al socket:", socket.id);
  
  socket.on("disconnect", () => {
    console.log("❌ Cliente desconectado:", socket.id);
  });
});

// 5. Iniciar servidor (usando httpServer en lugar de app.listen)
httpServer.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log("📡 WebSockets habilitados y listos");
  
  // Pasamos la instancia de 'io' al simulador para que pueda emitir eventos
  startRobotSimulation(io);
});