// src/store/robotStore.js
import { create } from 'zustand';
import axios from "axios";
import { io } from "socket.io-client"; 

const API_URL = "http://localhost:3001/api/robot";
const SOCKET_URL = "http://localhost:3001";

export const useRobotStore = create((set, get) => ({
  // --- ESTADO INICIAL ---
  socket: null, 
  isConnected: false,
  
  battery: {
    percentage: 0,
    status: "IDLE",
    voltage: 0,
    temperature: 0,
    timeRemaining: "...",
  },
  
  // Ahora controlMode está integrado en system para mejor sincronización
  system: {
    status: "IDLE",
    speed: 0,
    heading: 0,
    mode: "AUTO",
    emergencyStop: false, // E-STOP
    speedLimit: 50        // Límite de velocidad
  },
  
  position: { lat: null, lon: null },
  pathHistory: [],
  agronomicData: [], 
  sensors: { soilHumidity: 0, ambientTemp: 0, tankLevel: 0 },
  
  safeZone: null,
  navTarget: null, 
  navQueue: [], // Cola de navegación multipunto

  // --- 1. INICIALIZACIÓN Y SOCKETS (Tu código original restaurado) ---
  connectSocket: () => {
    const { socket } = get();
    if (socket) return; 

    const newSocket = io(SOCKET_URL, { transports: ["websocket"] });

    newSocket.on("connect", () => {
      set({ isConnected: true });
      const { safeZone } = get();
      if (safeZone) newSocket.emit("client:update_zone", safeZone);
    });

    newSocket.on("disconnect", () => {
      set({ isConnected: false });
    });

    // Escuchar estado del robot
    newSocket.on("robot:status", (data) => {
      set((state) => ({
        battery: { ...state.battery, ...data.battery },
        position: data.position,
        system: { 
            ...state.system, 
            ...data.system,
            emergencyStop: data.system.emergencyStop ?? state.system.emergencyStop,
            speedLimit: data.system.speedLimit ?? state.system.speedLimit
        },
        navTarget: data.system.target || null,
        navQueue: data.system.queue || []
      }));
    });

    // Escuchar nuevos datos de sensores
    newSocket.on("robot:new_data", (newRecord) => {
      set((state) => {
        const updatedData = [newRecord, ...state.agronomicData].slice(0, 50);
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
        position: { lat: estadoRes.data.current_lat, lon: estadoRes.data.current_lon },
        system: {
            ...state.system,
            speed: estadoRes.data.system_speed,
            heading: estadoRes.data.system_heading,
            status: estadoRes.data.system_status
        },
        agronomicData: validData,
        pathHistory: validData.map(d => ({ lat: Number(d.lat), lon: Number(d.lon) })),
      }));
    } catch (error) { console.error("Error carga inicial:", error); }
  },

  // --- 2. ACCIONES DE SEGURIDAD (Nuevas) ---
  toggleEmergencyStop: () => {
    const { socket, system } = get();
    const newState = !system.emergencyStop;
    
    set({ system: { ...system, emergencyStop: newState } });
    if (socket && socket.connected) {
        socket.emit("client:emergency_stop", newState);
    }
  },

  setSpeedLimit: (limit) => {
    const { socket, system } = get();
    const newLimit = Math.max(0, Math.min(100, limit));
    
    set({ system: { ...system, speedLimit: newLimit } });
    if (socket && socket.connected) {
        socket.emit("client:set_speed_limit", newLimit);
    }
  },

  // --- 3. ACCIONES DE NAVEGACIÓN (Nuevas) ---
  queueNavigationPoint: (lat, lon) => {
    const { socket, navTarget, navQueue, system, navigateToPoint } = get();
    
    if (!navTarget && system.mode !== "NAVIGATING") {
        navigateToPoint(lat, lon);
    } else {
        set({ navQueue: [...navQueue, { lat, lon }] });
        if (socket && socket.connected) {
            socket.emit("client:queue_point", { lat, lon });
        }
    }
  },

  navigateToPoint: (lat, lon) => {
      const { socket, system } = get();
      set({ 
          navTarget: { lat, lon }, 
          navQueue: [], 
          system: { ...system, mode: "NAVIGATING" } 
      }); 
      if (socket && socket.connected) {
          socket.emit("client:navigate_to", { lat, lon, clearQueue: true });
      }
  },

  // --- 4. ACCIONES DE ZONA Y CONTROL (Modificadas para el nuevo sistema) ---
  setSafeZone: (bounds) => {
    const { socket } = get();
    set({ safeZone: bounds });
    if (socket && socket.connected) socket.emit("client:update_zone", bounds);
  },

  clearSafeZone: () => {
    const { socket } = get();
    set({ safeZone: null });
    if (socket && socket.connected) socket.emit("client:clear_zone");
  },

  // Mantenemos esta función por compatibilidad, pero actualiza system.mode
  setControlMode: (mode) => {
      const { socket, system } = get();
      set({ system: { ...system, mode: mode } });
      if (socket && socket.connected) socket.emit("client:change_mode", mode);
  },

  sendManualMove: (velocity) => {
      const { socket, system } = get();
      if (system.mode !== "MANUAL") return;
      if (socket && socket.connected) socket.emit("client:manual_control", velocity);
  }
}));