// src/store/missionStore.js
import { create } from "zustand";

export const useMissionStore = create((set) => ({
  misiones: [],
  isLoading: false,
  error: null,

  fetchMisiones: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch("http://localhost:3001/api/missions");
      if (!response.ok) throw new Error("Error al obtener las misiones");
      const data = await response.json();
      set({ misiones: data, isLoading: false });
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },

  createMision: async (missionData) => {
    try {
      const response = await fetch("http://localhost:3001/api/missions", {
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

  deleteMision: async (id) => {
    try {
      const response = await fetch(`http://localhost:3001/api/missions/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Error al eliminar la misión");
      set((state) => ({ misiones: state.misiones.filter((m) => m.id !== id) }));
    } catch (error) {
      console.error(error);
    }
  }
}));