import { create } from 'zustand';
import axios from "axios";

const API_URL = "http://localhost:3001/api/robot";

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
  // Inicializamos siempre como array vacío
  agronomicData: [],
  sensors: {
    soilHumidity: 0,
    ambientTemp: 0,
    tankLevel: 0,
  },
};

export const useRobotStore = create((set) => ({
  ...initialState,

  fetchInitialData: async () => {
    try {
      const estadoRes = await axios.get(`${API_URL}/estado`);
      const datosRes = await axios.get(`${API_URL}/datos`);

      // Validación de seguridad: asegurar que data sea un array
      const validData = Array.isArray(datosRes.data) ? datosRes.data : [];

      set((state) => ({
        ...state,
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
        // Usamos los datos validados
        agronomicData: validData,
        // Mapeo seguro para el historial
        pathHistory: validData.map(d => ({ 
          lat: Number(d.lat), // Convertimos explícitamente a número
          lon: Number(d.lon) 
        })).filter(p => !isNaN(p.lat) && !isNaN(p.lon)), // Filtramos inválidos
      }));
    } catch (error) {
      console.error("Error al cargar datos del robot:", error);
    }
  },

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