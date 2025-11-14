// src/store/robotStore.js
import { create } from 'zustand';
// 1. YA NO importamos mockRobotData
import axios from "axios"; // 2. Importamos axios

// 3. Definimos la URL base de la API del robot
const API_URL = "http://localhost:3001/api/robot";

// 4. Estado inicial vacío (se rellenará desde la API)
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
  sensors: {
    soilHumidity: 0,
    ambientTemp: 0,
    tankLevel: 0,
  },
};

export const useRobotStore = create((set) => ({
  ...initialState,

  // 5. NUEVA ACCIÓN para cargar datos desde el backend
  fetchInitialData: async () => {
    try {
      // Hacemos las dos peticiones a nuestro backend
      const estadoRes = await axios.get(`${API_URL}/estado`);
      const datosRes = await axios.get(`${API_URL}/datos`);

      // 'estadoRes.data' es el objeto de la tabla 'robot_estado'
      // 'datosRes.data' es el array de la tabla 'robot_datos'

      set((state) => ({
        ...state,
        // Rellenamos el estado con los datos de 'robot_estado'
        battery: {
          percentage: estadoRes.data.battery_percentage,
          status: estadoRes.data.battery_status,
          voltage: estadoRes.data.battery_voltage,
          temperature: estadoRes.data.battery_temperature,
          timeRemaining: estadoRes.data.battery_time_remaining,
        },
        system: {
          status: estadoRes.data.system_status,
          speed: estadoRes.data.system_speed,
          heading: estadoRes.data.system_heading,
        },
        position: {
          lat: estadoRes.data.current_lat,
          lon: estadoRes.data.current_lon,
        },
        sensors: {
          soilHumidity: estadoRes.data.sensors_soil_humidity,
          ambientTemp: estadoRes.data.sensors_ambient_temp,
          tankLevel: estadoRes.data.sensors_tank_level,
        },
        // Rellenamos el historial con los datos de 'robot_datos'
        pathHistory: datosRes.data,
      }));
    } catch (error) {
      console.error("Error al cargar datos del robot:", error);
      // Opcional: poner un estado de error en el store
    }
  },

  // 6. Tus acciones antiguas (setSpeed, pauseTask)
  // (Por ahora no hacen nada en la DB, pero las dejamos)
  setSpeed: (newSpeed) => set((state) => ({
    system: { ...state.system, speed: newSpeed }
  })),
  
  pauseTask: () => set((state) => ({
    system: { ...state.system, status: "IDLE" }
  })),
  
  _updatePosition: (newPosition) => set({
    position: newPosition,
    pathHistory: [...useRobotStore.getState().pathHistory, newPosition]
  })
}));