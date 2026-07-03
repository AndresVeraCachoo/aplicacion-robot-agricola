import httpClient from "../config/httpClient";

/**
 * Servicio de usuarios.
 * Centraliza las llamadas a la API para la gestión de usuarios y perfiles.
 */
export const userService = {
  /**
   * Obtiene la lista de todos los usuarios.
   * @returns {Promise<Array<Object>>} Lista de usuarios.
   */
  getAll: async () => {
    const response = await httpClient.get("/users");
    return response.data;
  },

  /**
   * Crea un nuevo usuario.
   * @param {Object} userData - Datos del usuario.
   * @returns {Promise<Object>} Usuario creado.
   */
  create: async (userData) => {
    const response = await httpClient.post("/users", userData);
    return response.data;
  },

  /**
   * Actualiza un usuario existente por su ID.
   * @param {number|string} id - Identificador del usuario.
   * @param {Object} userData - Datos a actualizar.
   * @returns {Promise<Object>} Usuario actualizado.
   */
  update: async (id, userData) => {
    const response = await httpClient.put(`/users/${id}`, userData);
    return response.data;
  },

  /**
   * Elimina un usuario por su ID.
   * @param {number|string} id - Identificador del usuario.
   * @returns {Promise<void>}
   */
  delete: async (id) => {
    await httpClient.delete(`/users/${id}`);
  },

  /**
   * Obtiene el perfil del usuario autenticado.
   * @returns {Promise<Object>} Perfil de usuario.
   */
  getProfile: async () => {
    const response = await httpClient.get("/users/profile");
    return response.data;
  },

  /**
   * Actualiza el perfil del usuario autenticado.
   * @param {Object} profileData - Datos del perfil a actualizar.
   * @returns {Promise<Object>} Perfil actualizado.
   */
  updateProfile: async (profileData) => {
    const response = await httpClient.put("/users/profile", profileData);
    return response.data;
  },

  /**
   * Actualiza la contraseña del usuario autenticado.
   * @param {Object} passwordData - Contiene `currentPassword` y `newPassword`.
   * @returns {Promise<Object>} Respuesta del servidor.
   */
  updatePassword: async (passwordData) => {
    const response = await httpClient.put("/users/profile/password", passwordData);
    return response.data;
  },

  /**
   * Actualiza el avatar del usuario autenticado.
   * @param {string} avatarUrl - URL del nuevo avatar.
   * @returns {Promise<Object>} Datos actualizados.
   */
  updateAvatar: async (avatarUrl) => {
    const response = await httpClient.put("/users/profile/avatar", { avatarUrl });
    return response.data;
  }
};
