import express from "express";
import cors from "cors";
import "dotenv/config";

// Importamos las rutas
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import robotRoutes from "./routes/robotRoutes.js";

// IMPORTAR EL SIMULADOR
import { startRobotSimulation } from "./simulator.js";

const app = express();
const PORT = 3001;

// Middlewares globales
app.use(cors());
app.use(express.json());

// --- RUTAS ---
app.use("/api", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/robot", robotRoutes);

// --- INICIAR SERVIDOR ---
app.listen(PORT, () => {
  console.log(`🚀 Servidor backend corriendo en http://localhost:${PORT}`);
  console.log("Base de datos conectada y rutas cargadas.");
  
  // ARRANCAR LA SIMULACIÓN
  startRobotSimulation();
});