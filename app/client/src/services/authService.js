import httpClient from '../config/httpClient';

/**
 * Servicio de autenticación.
 * Centraliza las llamadas a la API relacionadas con la sesión del usuario.
 */
export const authService = {
  /**
   * Inicia sesión con credenciales.
   * @param {string} username - Nombre de usuario.
   * @param {string} password - Contraseña.
   * @returns {Promise<Object>} Datos de respuesta.
   */
  login: async (username, password) => {
    const response = await httpClient.post("/auth/login", { name: username, password });
    return response.data;
  },

  /**
   * Cierra la sesión activa.
   * @returns {Promise<Object>} Datos de respuesta.
   */
  logout: async () => {
    const response = await httpClient.post("/auth/logout");
    return response.data;
  },

  /**
   * Verifica el estado de la sesión actual en el backend.
   * @returns {Promise<Object>} Datos de respuesta con información del usuario.
   */
  verifySession: async () => {
    const response = await httpClient.get("/auth/verify");
    return response.data;
  }
};
