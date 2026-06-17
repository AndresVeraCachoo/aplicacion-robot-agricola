import { create } from 'zustand';
import httpClient from '../config/httpClient';
import { io } from "socket.io-client"; 

/**
 * @namespace Stores
 * @description Gestores de estado global basados en Zustand.
 */

/**
 * @namespace Stores.useRobotStore
 * @memberof Stores
 * @description Módulo encargado de la telemetría en tiempo real del robot.
 */

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;

function calculateBearing(startLat, startLng, destLat, destLng) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const toDeg = (rad) => (rad * 180) / Math.PI;

  const startLatRad = toRad(startLat);
  const destLatRad = toRad(destLat);
  const dLng = toRad(destLng - startLng);

  const y = Math.sin(dLng) * Math.cos(destLatRad);
  const x = Math.cos(startLatRad) * Math.sin(destLatRad) - Math.sin(startLatRad) * Math.cos(destLatRad) * Math.cos(dLng);

  let bearing = toDeg(Math.atan2(y, x));
  const offset = 80; 
  return (bearing - offset + 360) % 360; 
}

export const useRobotStore = create((set, get) => ({
  socket: null, 
  isConnected: false,
  isSidebarOpen: window.innerWidth > 768,
  
  /**
   * @function toggleSidebar
   * @memberof Stores.useRobotStore
   * @description Invierte el estado de visibilidad de la barra lateral.
   */
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  
  /**
   * @function setSidebarOpen
   * @memberof Stores.useRobotStore
   * @description Modifica el estado de apertura de la barra lateral.
   * @param {boolean} isOpen - Flag indicador.
   */
  setSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),

  /** @type {import('../types').RobotBateria} */
  battery: {
    percentage: 0,
    status: "IDLE",
    voltage: 0,
    temperature: 0,
    timeRemaining: "...",
    solarInput: 0,
    consumption: 0,
    netPower: 0,
  },
  
  /** @type {import('../types').RobotSistema} */
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
  deletedSessionKeys: [],

  /**
   * @function setTotalMissionPoints
   * @memberof Stores.useRobotStore
   * @description Establece la cuantía de puntos asignados a la trayectoria.
   * @param {number} points - Total waypoints.
   */
  setTotalMissionPoints: (points) => set({ totalMissionPoints: points }),

  /**
   * @function connectSocket
   * @memberof Stores.useRobotStore
   * @description Establece el flujo websocket bidireccional con el chasis.
   */
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
      set((state) => {
        const newBatteryData = data.battery || {};
        const currentSolar = newBatteryData.solarInput ?? state.battery.solarInput;
        const currentCons = newBatteryData.consumption ?? state.battery.consumption;
        const calculatedNetPower = currentSolar - currentCons;

        let newHeading = state.system.heading;
        const currentMode = data.system?.mode || state.system.mode;

        if (currentMode === "MANUAL" && data.system?.heading !== undefined) {
            newHeading = (data.system.heading - 80 + 360) % 360;
        } else if (data.position?.lat && data.position.lon && state.position.lat && state.position.lon) {
           const distance = Math.sqrt(
             Math.pow(data.position.lat - state.position.lat, 2) + 
             Math.pow(data.position.lon - state.position.lon, 2)
           );

           if (distance > 0.000005) { 
             newHeading = calculateBearing(state.position.lat, state.position.lon, data.position.lat, data.position.lon);
           }
        }

        return {
          battery: { 
            ...state.battery, 
            ...newBatteryData,
            netPower: calculatedNetPower 
          },
          position: data.position,
          system: { 
            ...state.system, 
            ...data.system,
            speedLimit: data.system?.speedLimit ?? state.system.speedLimit,
            heading: newHeading 
          },
          navTarget: data.system?.target || null,
          navQueue: data.system?.queue || []
        };
      });
    });

    newSocket.on("robot:new_data", (newRecord) => {
      set((state) => {
        const key = newRecord.ejecucion_id ? `exec-${newRecord.ejecucion_id}` : `miss-${newRecord.nombre_mision}`;
        if (state.deletedSessionKeys.includes(key)) {
            return state; 
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

  /**
   * @function disconnectSocket
   * @memberof Stores.useRobotStore
   * @description Destruye la instancia websocket de red activa.
   */
  disconnectSocket: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, isConnected: false });
    }
  },

  /**
   * @function fetchInitialData
   * @memberof Stores.useRobotStore
   * @description Recupera la información estática inicial mediante peticiones api rest concurrentes.
   * @returns {Promise<void>}
   */
  fetchInitialData: async () => {
    try {
      const statusResponse = await httpClient.get("/robot/estado");
      const dataResponse = await httpClient.get("/robot/datos");
      const validData = Array.isArray(dataResponse.data) ? dataResponse.data : [];

      set((state) => {
        const filteredData = validData.filter(d => {
            const key = d.ejecucion_id ? `exec-${d.ejecucion_id}` : `miss-${d.nombre_mision}`;
            return !state.deletedSessionKeys.includes(key);
        });

        return {
            battery: {
              percentage: statusResponse.data.battery_percentage,
              status: statusResponse.data.battery_status,
              voltage: statusResponse.data.battery_voltage || 12.5,
              temperature: statusResponse.data.battery_temperature || 30,
              timeRemaining: statusResponse.data.battery_time_remaining || "Calculando...",
              solarInput: 0, 
              consumption: 0.5,
              netPower: -0.5 
            },
            position: { lat: statusResponse.data.current_lat, lon: statusResponse.data.current_lon },
            system: {
                ...state.system,
                speed: statusResponse.data.system_speed,
                heading: statusResponse.data.system_heading,
                status: statusResponse.data.system_status
            },
            agronomicData: filteredData,
            pathHistory: filteredData.map(d => ({ lat: Number(d.lat), lon: Number(d.lon) })),
        };
      });
    } catch (error) { 
      console.error("Error carga inicial:", error); 
    }
  },

  /**
   * @function setSpeedLimit
   * @memberof Stores.useRobotStore
   * @description Setea un límite a la velocidad del motor.
   * @param {number} limit - Valor máximo.
   */
  setSpeedLimit: (limit) => {
    const { socket, system } = get();
    const newLimit = Math.max(0, Math.min(100, limit));
    set({ system: { ...system, speedLimit: newLimit } });
    if (socket?.connected) socket.emit("client:set_speed_limit", newLimit);
  },

  /**
   * @function queueNavigationPoint
   * @memberof Stores.useRobotStore
   * @description Encola un waypoint en la ruta geográfica activa.
   * @param {number} lat - Latitud.
   * @param {number} lon - Longitud.
   */
  queueNavigationPoint: (lat, lon) => {
    const { socket, navTarget, navQueue, system, navigateToPoint } = get();
    if (!navTarget && system.mode !== "NAVIGATING") {
        navigateToPoint(lat, lon);
    } else {
        set({ navQueue: [...navQueue, { lat, lon }] });
        if (socket?.connected) socket.emit("client:queue_point", { lat, lon });
    }
  },

  /**
   * @function navigateToPoint
   * @memberof Stores.useRobotStore
   * @description Fuerza la navegación unívoca y prioritaria a un objetivo.
   * @param {number} lat - Latitud.
   * @param {number} lon - Longitud.
   */
  navigateToPoint: (lat, lon) => {
      const { socket, system } = get();
      set({ navTarget: { lat, lon }, navQueue: [], system: { ...system, mode: "NAVIGATING" } }); 
      if (socket?.connected) socket.emit("client:navigate_to", { lat, lon, clearQueue: true });
  },

  /**
   * @function setSafeZone
   * @memberof Stores.useRobotStore
   * @description Acota el área permitida de operaciones (geofencing).
   * @param {Array<Array<number>>} bounds - Matriz de vértices gps.
   */
  setSafeZone: (bounds) => {
    const { socket } = get();
    set({ safeZone: bounds });
    if (socket?.connected) socket.emit("client:update_zone", bounds);
  },

  /**
   * @function clearSafeZone
   * @memberof Stores.useRobotStore
   * @description Remueve la valla virtual del mapa.
   */
  clearSafeZone: () => {
    const { socket } = get();
    set({ safeZone: null });
    if (socket?.connected) socket.emit("client:clear_zone");
  },

  /**
   * @function setControlMode
   * @memberof Stores.useRobotStore
   * @description Intercambia el modo operativo de conducción de la cpu.
   * @param {string} mode - MANUAL o AUTO.
   */
  setControlMode: (mode) => {
      const { socket, system } = get();
      set({ system: { ...system, mode: mode } });
      if (socket?.connected) socket.emit("client:change_mode", mode);
  },

  /**
   * @function sendManualMove
   * @memberof Stores.useRobotStore
   * @description Envía vectores físicos de movimiento direccional.
   * @param {Object} velocity - Estructura X/Y de velocidad.
   */
  sendManualMove: (velocity) => {
      const { socket, system } = get();
      if (system.mode !== "MANUAL") return;
      if (socket?.connected) socket.emit("client:manual_control", velocity);
  },

  /**
   * @function togglePauseMission
   * @memberof Stores.useRobotStore
   * @description Conmuta el estado de pausa de las tareas de campo.
   */
  togglePauseMission: () => {
    const { socket, system } = get();
    if (!socket?.connected) return;
    if (system.status === "PAUSED") {
        socket.emit("client:resume_mission");
    } else {
        socket.emit("client:pause_mission");
    }
  },

  /**
   * @function cancelMission
   * @memberof Stores.useRobotStore
   * @description Aborta de forma definitiva las tareas agrícolas y purga restricciones.
   */
  cancelMission: () => {
    const { socket, system, clearSafeZone } = get();
    clearSafeZone(); 
    set({ system: { ...system, mode: "MANUAL" } });
    if (socket?.connected) socket.emit("client:cancel_mission");
  },

  /**
   * @function deleteSessionData
   * @memberof Stores.useRobotStore
   * @description Filtra y oculta de la UI los datos relativos a una sesión descartada.
   * @param {string} sessionKey - Clave única identificativa.
   */
  deleteSessionData: (sessionKey) => {
    set((state) => {
      const newDeletedKeys = [...state.deletedSessionKeys, sessionKey];
      const filteredData = state.agronomicData.filter(d => {
        const key = d.ejecucion_id ? `exec-${d.ejecucion_id}` : `miss-${d.nombre_mision}`;
        return key !== sessionKey;
      });
      return { agronomicData: filteredData, deletedSessionKeys: newDeletedKeys };
    });
  }
}));