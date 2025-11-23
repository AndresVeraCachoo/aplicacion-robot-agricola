import { create } from 'zustand';
import axios from "axios";
import { io } from "socket.io-client"; 

const API_URL = "http://localhost:3001/api/robot";
const SOCKET_URL = "http://localhost:3001";

const initialState = {
  battery: {
    percentage: 0,
    status: "IDLE",
    voltage: 0,
    temperature: 0,
    timeRemaining: "...",
  },
  system: {
    status: "IDLE",
    speed: 0,
    heading: 0,
  },
  position: {
    lat: null,
    lon: null,
  },
  pathHistory: [],
  agronomicData: [], 
  sensors: {
    soilHumidity: 0,
    ambientTemp: 0,
    tankLevel: 0,
  },
  isConnected: false, 
};

export const useRobotStore = create((set, get) => ({
  ...initialState,
  
  socket: null, 

  // Acción para conectar
  connectSocket: () => {
    const { socket } = get();
    if (socket) return; // Ya conectado

    console.log("🔌 Iniciando conexión WebSocket...");
    const newSocket = io(SOCKET_URL, {
      transports: ["websocket"], 
    });

    newSocket.on("connect", () => {
      console.log("🟢 WS Conectado con ID:", newSocket.id);
      set({ isConnected: true });
    });

    newSocket.on("disconnect", () => {
      console.log("🔴 WS Desconectado");
      set({ isConnected: false });
    });

    // 1. TELEMETRÍA (Posición, Batería)
    newSocket.on("robot:status", (data) => {
      set((state) => ({
        battery: { ...state.battery, ...data.battery },
        position: data.position,
        system: { ...state.system, ...data.system },
      }));
    });

    // 2. NUEVOS DATOS (Muestras)
    newSocket.on("robot:new_data", (newRecord) => {
      // console.log("🌱 Nuevo dato recibido:", newRecord.id);
      set((state) => {
        // Añadimos al principio y limitamos a 50
        const updatedData = [newRecord, ...state.agronomicData].slice(0, 50);
        
        // Actualizamos rastro visual
        const newPathPoint = { lat: Number(newRecord.lat), lon: Number(newRecord.lon) };
        
        return {
          agronomicData: updatedData,
          pathHistory: [...state.pathHistory, newPathPoint]
        };
      });
    });

    set({ socket: newSocket });
  },

  disconnectSocket: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, isConnected: false });
    }
  },

  // Carga inicial HTTP (Snapshot)
  fetchInitialData: async () => {
    try {
      const estadoRes = await axios.get(`${API_URL}/estado`);
      const datosRes = await axios.get(`${API_URL}/datos`);
      const validData = Array.isArray(datosRes.data) ? datosRes.data : [];

      set((state) => ({
        ...state,
        battery: {
          percentage: estadoRes.data.battery_percentage,
          status: estadoRes.data.battery_status,
          voltage: 12.5,
          temperature: 30,
          timeRemaining: "Calculando...",
        },
        position: {
          lat: estadoRes.data.current_lat,
          lon: estadoRes.data.current_lon,
        },
        system: {
            speed: estadoRes.data.system_speed,
            heading: estadoRes.data.system_heading,
            status: estadoRes.data.system_status
        },
        agronomicData: validData,
        pathHistory: validData.map(d => ({ lat: Number(d.lat), lon: Number(d.lon) })),
      }));
    } catch (error) {
      console.error("Error carga inicial:", error);
    }
  },
}));