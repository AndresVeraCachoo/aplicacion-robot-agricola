import express from 'express';
import cors from 'cors';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

app.use(cors());
app.use(express.json());

// --- ESTADO DEL ROBOT (Simulador) ---
let robotState = {
  id: "ROBOT-01",
  bateria: 100,
  posicion: { lat: 40.4167, lng: -3.7033 }, // Base de carga
  estado: "DISPONIBLE",
  misionActual: null
};

// --- RUTAS ---
app.get('/api/robot', (req, res) => res.json(robotState));

app.post('/api/auth/login', (req, res) => {
  const { name, password } = req.body;
  // Login simple para desarrollo
  if (name === "admin" && password === "admin") {
    return res.json({ 
      token: "fake-jwt-token", 
      user: { name: "Admin", role: "ADMIN" } 
    });
  }
  res.status(401).json({ error: "Credenciales inválidas" });
});

app.get('/api/auth/verify', (req, res) => res.json({ valid: true }));

app.get('/api/missions', (req, res) => {
  res.json([
    { id: 1, nombre: "Ruta Olivos Norte", puntos: [] },
    { id: 2, nombre: "Cosecha Sector B", puntos: [] }
  ]);
});

// --- LÓGICA DEL SOCKET Y SIMULACIÓN ---
io.on('connection', (socket) => {
  console.log('🟢 Cliente conectado:', socket.id);
  
  socket.emit('robot_update', robotState);

  socket.on('manual_control', (data) => {
    // Lógica simple de movimiento manual
    robotState.posicion.lat += data.dy || 0;
    robotState.posicion.lng += data.dx || 0;
    robotState.bateria -= 0.01;
    io.emit('robot_update', robotState);
  });

  socket.on('disconnect', () => console.log('🔴 Cliente desconectado'));
});

// Loop del simulador (Batería y movimiento autónomo básico)
setInterval(() => {
  if (robotState.estado === "EJECUTANDO") {
    robotState.bateria -= 0.05;
    if (robotState.bateria <= 0) robotState.bateria = 0;
    io.emit('robot_update', robotState);
  }
}, 2000);

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`🚀 Servidor en http://localhost:${PORT}`);
});