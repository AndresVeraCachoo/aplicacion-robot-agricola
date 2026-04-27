// src/store/missionStore.js
import { create } from "zustand";

const API_URL = `${import.meta.env.VITE_API_URL}/missions`;

export const useMissionStore = create((set) => ({
  misiones: [],
  isLoading: false,
  error: null,

  fetchMisiones: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(API_URL);
      if (!response.ok) throw new Error("Error al obtener las misiones");
      const data = await response.json();
      set({ misiones: data, isLoading: false });
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },

  createMision: async (missionData) => {
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(missionData),
      });
      if (!response.ok) throw new Error("Error al crear la misión");
      const newMission = await response.json();
      set((state) => ({ misiones: [newMission, ...state.misiones] }));
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  },

  updateMision: async (id, missionData) => {
    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(missionData),
      });
      
      if (!response.ok) {
        throw new Error(`Error al actualizar la misión: ${response.status}`);
      }
      
      const updatedMission = await response.json();
      
      set((state) => ({
        misiones: state.misiones.map((m) => (m.id === id ? updatedMission : m)),
      }));
      return true;
    } catch (error) {
      console.error("Error al actualizar la misión en el store:", error);
      return false;
    }
  },

  deleteMision: async (id) => {
    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Error al eliminar la misión");
      set((state) => ({ misiones: state.misiones.filter((m) => m.id !== id) }));
    } catch (error) {
      console.error(error);
    }
  },

  startMissionRun: async (misionId) => {
    try {
      const response = await fetch(`${API_URL}/${misionId}/runs`, {
        method: "POST"
      });
      if (!response.ok) throw new Error("Error al iniciar la ejecución de la misión");
      return await response.json();
    } catch (error) {
      console.error(error);
      return null;
    }
  }
}));