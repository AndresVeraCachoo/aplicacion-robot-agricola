import { create } from "zustand";
import httpClient from "../config/httpClient";

/**
 * @namespace Stores.useMissionStore
 * @memberof Stores
 * @description Módulo de persistencia relacional encargado de la gestión CRUD de misiones.
 */

export const useMissionStore = create((set) => ({
  /** @type {Array<import('../types').Mision>} */
  misiones: [],
  isLoading: false,
  error: null,

  /**
   * @function fetchMisiones
   * @memberof Stores.useMissionStore
   * @description Consume la api rest para rellenar la colección de planificaciones.
   * @returns {Promise<void>}
   */
  fetchMisiones: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await httpClient.get("/missions");
      set({ misiones: response.data, isLoading: false });
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },

  /**
   * @function createMision
   * @memberof Stores.useMissionStore
   * @description Remite un objeto misión para su almacenamiento en base de datos.
   * @param {Object} missionData - Campos requeridos.
   * @returns {Promise<boolean>}
   */
  createMision: async (missionData) => {
    try {
      const response = await httpClient.post("/missions", missionData);
      set((state) => ({ misiones: [response.data, ...state.misiones] }));
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  },

  /**
   * @function updateMision
   * @memberof Stores.useMissionStore
   * @description Modifica parámetros de una planificación mediante verbo PUT.
   * @param {number|string} id - Clave primaria.
   * @param {Object} missionData - Parámetros mutados.
   * @returns {Promise<boolean>}
   */
  updateMision: async (id, missionData) => {
    try {
      const response = await httpClient.put(`/missions/${id}`, missionData);
      set((state) => ({
        misiones: state.misiones.map((m) => (m.id === id ? response.data : m)),
      }));
      return true;
    } catch (error) {
      console.error("Error al actualizar la misión en el store:", error);
      return false;
    }
  },

  /**
   * @function deleteMision
   * @memberof Stores.useMissionStore
   * @description Ejecuta el borrado lógico/físico de un registro.
   * @param {number|string} id - ID de base de datos.
   * @returns {Promise<void>}
   */
  deleteMision: async (id) => {
    try {
      await httpClient.delete(`/missions/${id}`);
      set((state) => ({ misiones: state.misiones.filter((m) => m.id !== id) }));
    } catch (error) {
      console.error(error);
    }
  },

  /**
   * @function startMissionRun
   * @memberof Stores.useMissionStore
   * @description Da la señal de ignición al hardware para inicializar una ruta.
   * @param {number|string} misionId - Misión de origen.
   * @returns {Promise<Object|null>} Instancia de ejecución de ruta.
   */
  startMissionRun: async (misionId) => {
    try {
      const response = await httpClient.post(`/missions/${misionId}/runs`);
      return response.data;
    } catch (error) {
      console.error(error);
      return null;
    }
  }
}));