// src/store/robotStore.js
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
    mode: "AUTO",
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
  safeZone: null,
  controlMode: "AUTO", 
  navTarget: null, // Nuevo estado para dibujar la línea en el mapa
};

export const useRobotStore = create((set, get) => ({
  ...initialState,
  socket: null, 

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

    newSocket.on("robot:status", (data) => {
      set((state) => ({
        battery: { ...state.battery, ...data.battery },
        position: data.position,
        system: { ...state.system, ...data.system },
        controlMode: data.system.mode || state.controlMode,
        // Sincronizar el target si viene del backend
        navTarget: data.system.target || null 
      }));
    });

    newSocket.on("robot:mode_changed", (mode) => {
        set({ controlMode: mode });
        if (mode !== "NAVIGATING") set({ navTarget: null });
    });

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
            speed: estadoRes.data.system_speed,
            heading: estadoRes.data.system_heading,
            status: estadoRes.data.system_status
        },
        agronomicData: validData,
        pathHistory: validData.map(d => ({ lat: Number(d.lat), lon: Number(d.lon) })),
      }));
    } catch (error) { console.error("Error carga inicial:", error); }
  },

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

  setControlMode: (mode) => {
      const { socket } = get();
      set({ controlMode: mode });
      if (socket && socket.connected) socket.emit("client:set_mode", mode);
  },

  sendManualMove: (velocity) => {
      const { socket, controlMode } = get();
      if (controlMode !== "MANUAL") return;
      if (socket && socket.connected) socket.emit("client:manual_move", velocity);
  },

  // NUEVA ACCIÓN: Navegar a punto
  navigateToPoint: (lat, lon) => {
      const { socket } = get();
      set({ navTarget: { lat, lon } }); // Optimista
      if (socket && socket.connected) {
          socket.emit("client:navigate_to", { lat, lon });
      }
  }
}));