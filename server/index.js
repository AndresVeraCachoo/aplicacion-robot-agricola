/* eslint-env node */
import express from "express";
import cors from "cors";
import "dotenv/config";

// Importamos las rutas desde sus archivos
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import robotRoutes from "./routes/robotRoutes.js";

const app = express();
const PORT = 3001;

// Middlewares globales
app.use(cors());
app.use(express.json());

// --- RUTAS ---
// 1. Rutas de Autenticación (Login) -> /api/login
app.use("/api", authRoutes);

// 2. Rutas de Usuarios (CRUD) -> /api/users
app.use("/api/users", userRoutes);

// 3. Rutas del Robot -> /api/robot
app.use("/api/robot", robotRoutes);

// --- INICIAR SERVIDOR ---
app.listen(PORT, () => {
  console.log(`🚀 Servidor backend corriendo en http://localhost:${PORT}`);
  console.log("Base de datos conectada y rutas cargadas.");
});