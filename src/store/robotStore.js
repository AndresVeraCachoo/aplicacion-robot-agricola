// src/store/robotStore.js
import { create } from 'zustand';
import axios from "axios";
import { io } from "socket.io-client"; 

const API_URL = "http://localhost:3001/api/robot";
const SOCKET_URL = "http://localhost:3001";

export const useRobotStore = create((set, get) => ({
  socket: null, 
  isConnected: false,
  
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
    speedLimit: 50
  },
  
  position: { lat: null, lon: null },
  pathHistory: [],
  agronomicData: [], 
  sensors: { soilHumidity: 0, ambientTemp: 0, tankLevel: 0 },
  
  safeZone: null,
  navTarget: null, 
  navQueue: [],
  
  totalMissionPoints: 0,
  
  // NUEVO: Lista negra para bloquear misiones que el usuario ha decidido borrar
  deletedSessionKeys: [],

  setTotalMissionPoints: (points) => set({ totalMissionPoints: points }),

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
        system: { 
            ...state.system, 
            ...data.system,
            speedLimit: data.system.speedLimit ?? state.system.speedLimit
        },
        navTarget: data.system.target || null,
        navQueue: data.system.queue || []
      }));
    });

    newSocket.on("robot:new_data", (newRecord) => {
      set((state) => {
        // Filtramos por la lista negra antes de añadirlo
        const key = newRecord.ejecucion_id ? `exec-${newRecord.ejecucion_id}` : `miss-${newRecord.nombre_mision}`;
        if (state.deletedSessionKeys.includes(key)) {
            return state; // Si está borrada, la ignoramos completamente
        }

        const updatedData = [newRecord, ...state.agronomicData].slice(0, 1000);
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

      set((state) => {
        // Al recargar desde la BD, purgamos las misiones borradas usando la lista negra
        const filteredData = validData.filter(d => {
            const key = d.ejecucion_id ? `exec-${d.ejecucion_id}` : `miss-${d.nombre_mision}`;
            return !state.deletedSessionKeys.includes(key);
        });

        return {
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
            agronomicData: filteredData,
            pathHistory: filteredData.map(d => ({ lat: Number(d.lat), lon: Number(d.lon) })),
        };
      });
    } catch (error) { console.error("Error carga inicial:", error); }
  },

  setSpeedLimit: (limit) => {
    const { socket, system } = get();
    const newLimit = Math.max(0, Math.min(100, limit));
    
    set({ system: { ...system, speedLimit: newLimit } });
    if (socket?.connected) {
        socket.emit("client:set_speed_limit", newLimit);
    }
  },

  queueNavigationPoint: (lat, lon) => {
    const { socket, navTarget, navQueue, system, navigateToPoint } = get();
    
    if (!navTarget && system.mode !== "NAVIGATING") {
        navigateToPoint(lat, lon);
    } else {
        set({ navQueue: [...navQueue, { lat, lon }] });
        if (socket?.connected) {
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
      if (socket?.connected) {
          socket.emit("client:navigate_to", { lat, lon, clearQueue: true });
      }
  },

  setSafeZone: (bounds) => {
    const { socket } = get();
    set({ safeZone: bounds });
    if (socket?.connected) socket.emit("client:update_zone", bounds);
  },

  clearSafeZone: () => {
    const { socket } = get();
    set({ safeZone: null });
    if (socket?.connected) socket.emit("client:clear_zone");
  },

  setControlMode: (mode) => {
      const { socket, system } = get();
      set({ system: { ...system, mode: mode } });
      if (socket?.connected) socket.emit("client:change_mode", mode);
  },

  sendManualMove: (velocity) => {
      const { socket, system } = get();
      if (system.mode !== "MANUAL") return;
      if (socket?.connected) socket.emit("client:manual_control", velocity);
  },

  togglePauseMission: () => {
    const { socket, system } = get();
    if (!socket?.connected) return;

    if (system.status === "PAUSED") {
        socket.emit("client:resume_mission");
    } else {
        socket.emit("client:pause_mission");
    }
  },

  cancelMission: () => {
    const { socket, system, clearSafeZone } = get();
    
    clearSafeZone(); 
    set({ system: { ...system, mode: "MANUAL" } });

    if (socket?.connected) {
        socket.emit("client:cancel_mission");
    }
  },

  // Función CORREGIDA de borrado: Actualiza la lista negra para evitar reapariciones
  deleteSessionData: (sessionKey) => {
    set((state) => {
      const newDeletedKeys = [...state.deletedSessionKeys, sessionKey];
      
      const filteredData = state.agronomicData.filter(d => {
        const key = d.ejecucion_id ? `exec-${d.ejecucion_id}` : `miss-${d.nombre_mision}`;
        return key !== sessionKey;
      });
      
      return { 
          agronomicData: filteredData,
          deletedSessionKeys: newDeletedKeys 
      };
    });
  }
}));