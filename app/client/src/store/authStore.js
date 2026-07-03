import { create } from 'zustand';
import { authService } from '../services/authService';
import httpClient from '../config/httpClient';

/**
 * Gestor de estado global para la autenticación usando Zustand.
 */
export const useAuthStore = create((set) => ({
  isLoggedIn: false,
  userRole: null,
  isLoading: true,

  /**
   * Inicia sesión llamando al servicio.
   * @param {string} username - Nombre de usuario.
   * @param {string} password - Contraseña.
   * @returns {Promise<Object>} Resultado de la operación.
   */
  login: async (username, password) => {
    try {
      const data = await authService.login(username, password);
      
      localStorage.setItem("userRole", data.user.role);
      
      set({ 
        isLoggedIn: true, 
        userRole: data.user.role 
      });

      return { success: true };
    } catch (error) {
      console.error("Error de login:", error);
      return { success: false, message: error.response?.data?.error || "Error al iniciar sesión" };
    }
  },

  /**
   * Cierra sesión.
   * Elimina datos locales y notifica al servidor.
   */
  logout: async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error("Error al cerrar sesión en el servidor:", error);
    } finally {
      localStorage.removeItem("userRole");
      set({ isLoggedIn: false, userRole: null });
    }
  },

  /**
   * Inicializa el estado verificando si hay una sesión válida en el servidor
   * y configurando el interceptor HTTP.
   */
  initAuth: async () => {
    set({ isLoading: true });
    
    // Configurar el interceptor de Axios para capturar 401/403
    // Esto se ejecuta una vez al inicializar
    const interceptor = httpClient.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
          // Si el servidor rechaza por token inválido/expirado, forzamos logout local
          localStorage.removeItem("userRole");
          set({ isLoggedIn: false, userRole: null });
        }
        return Promise.reject(error);
      }
    );

    try {
      const data = await authService.verifySession();
      if (data.user) {
        localStorage.setItem("userRole", data.user.role);
        set({ isLoggedIn: true, userRole: data.user.role, isLoading: false });
      }
    } catch (error) {
      console.warn("Sesión no válida o expirada", error.message);
      localStorage.removeItem("userRole");
      set({ isLoggedIn: false, userRole: null, isLoading: false });
    }

    return () => {
      httpClient.interceptors.response.eject(interceptor);
    };
  }
}));
