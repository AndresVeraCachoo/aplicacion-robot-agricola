import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { missionService } from "../services/missionService";

/**
 * Hook para la gestión de misiones usando React Query.
 * Reemplaza el antiguo estado global de Zustand para delegar el caché, reintentos y sincronización
 * directamente a TanStack Query.
 */
export function useMissions() {
  const queryClient = useQueryClient();

  // ----- Consultas (GET) -----

  /**
   * Obtiene la lista completa de misiones.
   */
  const { 
    data: missions = [], 
    isLoading, 
    error,
    refetch: fetchMissions 
  } = useQuery({
    queryKey: ["missions"],
    queryFn: () => missionService.getAll(),
  });

  // ----- Mutaciones (POST, PUT, DELETE) -----

  /**
   * Crea una nueva misión.
   */
  const createMutation = useMutation({
    mutationFn: (missionData) => missionService.create(missionData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["missions"] });
    },
  });

  /**
   * Actualiza una misión existente.
   */
  const updateMutation = useMutation({
    mutationFn: ({ id, missionData }) => missionService.update(id, missionData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["missions"] });
    },
  });

  /**
   * Elimina una misión.
   */
  const deleteMutation = useMutation({
    mutationFn: (id) => missionService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["missions"] });
    },
  });

  /**
   * Inicia la ejecución de una misión en el robot real/simulador.
   */
  const startRunMutation = useMutation({
    mutationFn: (missionId) => missionService.startRun(missionId),
  });

  // Adaptamos la interfaz para que los componentes que usaban Zustand requieran la menor refactorización posible
  return {
    missions,
    isLoading,
    error: error ? error.message : null,
    fetchMissions,
    createMission: async (missionData) => {
      try {
        await createMutation.mutateAsync(missionData);
        return true;
      } catch (err) {
        console.error(err);
        return false;
      }
    },
    updateMission: async (id, missionData) => {
      try {
        await updateMutation.mutateAsync({ id, missionData });
        return true;
      } catch (err) {
        console.error("Error al actualizar la misión en el hook:", err);
        return false;
      }
    },
    deleteMission: async (id) => {
      try {
        await deleteMutation.mutateAsync(id);
      } catch (err) {
        console.error(err);
      }
    },
    startMissionRun: async (missionId) => {
      try {
        return await startRunMutation.mutateAsync(missionId);
      } catch (err) {
        console.error(err);
        return null;
      }
    },
  };
}
