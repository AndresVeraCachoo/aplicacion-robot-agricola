// src/data/mockRobotData.js
// Esta es nuestra "API Falsa" (Contrato de Datos).
// Define todo lo que necesitamos para construir la interfaz.

export const mockRobotData = {
  // Para Header y el futuro Modal de Batería
  battery: {
    percentage: 78,
    status: "DISCHARGING", // "CHARGING", "IDLE"
    voltage: 24.1,
    temperature: 32, // Celsius
    timeRemaining: "2h 05m",
  },

  // Para el Dashboard y el Minimapa
  system: {
    status: "OPERATING", // "IDLE", "ERROR", "CHARGING"
    speed: 1.2, // m/s
  },

  // Para el Mapa en tiempo real
  position: {
    lat: 42.34399,
    lon: -3.70325,
  },

  // Para el Historial de Ruta
  pathHistory: [
    { lat: 42.343, lon: -3.703 },
    { lat: 42.34315, lon: -3.7031 },
    { lat: 42.3433, lon: -3.70315 },
    { lat: 42.3435, lon: -3.7032 },
    { lat: 42.34399, lon: -3.70325 },
  ],

  // Para la página de la Cámara
  camera: {
    frontStreamUrl: "https://url-falsa-del-stream-frontal.mjpg",
    rearStreamUrl: "https://url-falsa-del-stream-trasero.mjpg",
  },

  // Para la página de Datos
  sensors: {
    soilHumidity: 45, // %
    ambientTemp: 28, // Celsius
    tankLevel: 75, // %
  },
};
