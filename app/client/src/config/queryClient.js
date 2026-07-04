import { QueryClient } from "@tanstack/react-query";

/**
 * Cliente centralizado para React Query.
 * Configura los tiempos de caché, reintentos y comportamientos por defecto.
 * @type {QueryClient}
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Evita re-peticiones molestas al cambiar de pestaña
      retry: 1, // Si falla, solo reintenta una vez por defecto
      staleTime: 5 * 60 * 1000, // 5 minutos antes de considerar la data obsoleta
    },
  },
});
