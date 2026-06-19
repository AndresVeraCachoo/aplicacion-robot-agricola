import { create } from "zustand";
import httpClient from "../config/httpClient";

/**
 * Gestor de estado global para misiones.
 * Módulo encargado de la gestión CRUD de misiones mediante Zustand.
 */

export const useMissionStore = create((set) => ({
  /** @type {Array<Object>} */
  missions: [],
  isLoading: false,
  error: null,

  /**
   * Consume la API REST para rellenar la colección de planificaciones.
   * @returns {Promise<void>}
   */
  fetchMissions: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await httpClient.get("/missions");
      set({ missions: response.data, isLoading: false });
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },

  /**
   * Remite un objeto misión para su almacenamiento en base de datos.
   * @param {Object} missionData - Campos requeridos.
   * @returns {Promise<boolean>}
   */
  createMission: async (missionData) => {
    try {
      const response = await httpClient.post("/missions", missionData);
      set((state) => ({ missions: [response.data, ...state.missions] }));
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  },

  /**
   * Modifica parámetros de una planificación mediante verbo PUT.
   * @param {number|string} id - Clave primaria.
   * @param {Object} missionData - Parámetros mutados.
   * @returns {Promise<boolean>}
   */
  updateMission: async (id, missionData) => {
    try {
      const response = await httpClient.put(`/missions/${id}`, missionData);
      set((state) => ({
        missions: state.missions.map((m) => (m.id === id ? response.data : m)),
      }));
      return true;
    } catch (error) {
      console.error("Error al actualizar la misión en el store:", error);
      return false;
    }
  },

  /**
   * Ejecuta el borrado lógico/físico de un registro.
   * @param {number|string} id - ID de base de datos.
   * @returns {Promise<void>}
   */
  deleteMission: async (id) => {
    try {
      await httpClient.delete(`/missions/${id}`);
      set((state) => ({ missions: state.missions.filter((m) => m.id !== id) }));
    } catch (error) {
      console.error(error);
    }
  },

  /**
   * Da la señal de ignición al hardware para inicializar una ruta.
   * @param {number|string} misionId - Misión de origen.
   * @returns {Promise<Object|null>} Instancia de ejecución de ruta.
   */
  startMissionRun: async (missionId) => {
    try {
      const response = await httpClient.post(`/missions/${missionId}/runs`);
      return response.data;
    } catch (error) {
      console.error(error);
      return null;
    }
  }
}));