// src/store/robotStore.js
import { create } from 'zustand';
import { mockRobotData } from '../data/mockRobotData';

// Creamos un hook global 'useRobotStore'
// Cualquier componente que lo llame, tendrá acceso a estos datos
// y se re-renderizará automáticamente cuando cambien.
export const useRobotStore = create((set) => ({
  // 1. El estado inicial se carga desde nuestros datos falsos
  ...mockRobotData,
  
  // 2. Acciones: Funciones que pueden modificar el estado
  // (Por ahora son falsas, en el futuro enviarán comandos WebSocket)
  
  setSpeed: (newSpeed) => set((state) => ({
    system: { ...state.system, speed: newSpeed }
  })),
  
  pauseTask: () => set((state) => ({
    system: { ...state.system, status: "IDLE" }
  })),
  
  // Esta función simulará al robot moviéndose
  _updatePosition: (newPosition) => set({
    position: newPosition,
    pathHistory: [...useRobotStore.getState().pathHistory, newPosition]
  })
}));