import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { userService } from "../../../services/userService";

/**
 * Hook para la gestión de usuarios usando React Query.
 * Maneja el caché, actualizaciones en tiempo real y mutaciones.
 */
export function useUsers() {
  const queryClient = useQueryClient();

  // ----- Consultas (GET) -----

  /**
   * Obtiene la lista completa de usuarios.
   */
  const { 
    data: users = [], 
    isLoading, 
    error,
    refetch: fetchUsers 
  } = useQuery({
    queryKey: ["users"],
    queryFn: () => userService.getAll(),
  });

  // ----- Mutaciones (POST, PUT, DELETE) -----

  /**
   * Crea un nuevo usuario.
   */
  const createMutation = useMutation({
    mutationFn: (userData) => userService.create(userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  /**
   * Actualiza un usuario existente.
   */
  const updateMutation = useMutation({
    mutationFn: ({ id, userData }) => userService.update(id, userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  /**
   * Elimina un usuario.
   */
  const deleteMutation = useMutation({
    mutationFn: (id) => userService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  return {
    users,
    isLoading,
    error: error ? error.message : null,
    fetchUsers,
    createUser: createMutation.mutateAsync,
    updateUser: async (id, userData) => {
      return await updateMutation.mutateAsync({ id, userData });
    },
    deleteUser: deleteMutation.mutateAsync,
  };
}
