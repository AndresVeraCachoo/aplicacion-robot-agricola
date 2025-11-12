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
    heading: 75, // Dirección en grados (0-360)
  },

  // Para el Mapa en tiempo real
  position: {
    lat: 42.363959,
    lon: -3.699930,
  },

  // Para el Historial de Ruta
  pathHistory: [
    { lat: 42.342845, lon: -3.707339 },
    { lat: 42.341005, lon: -3.701786 },
    { lat: 42.340779, lon: -3.704174 },
    { lat: 42.339170, lon: -3.697168 },
    { lat: 42.351270, lon: -3.688858 },
    { lat: 42.363959, lon: -3.699930 },
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
