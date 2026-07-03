import httpClient from "../config/httpClient";

/**
 * Servicio de misiones.
 * Centraliza las llamadas a la API relacionadas con la gestión de misiones.
 */
export const missionService = {
  /**
   * Obtiene la lista de todas las misiones.
   * @returns {Promise<Object>} Datos de respuesta.
   */
  getAll: async () => {
    const response = await httpClient.get("/missions");
    return response.data;
  },

  /**
   * Crea una nueva misión.
   * @param {Object} missionData - Datos de la misión.
   * @returns {Promise<Object>} Datos de la misión creada.
   */
  create: async (missionData) => {
    const response = await httpClient.post("/missions", missionData);
    return response.data;
  },

  /**
   * Actualiza una misión existente.
   * @param {number|string} id - Identificador de la misión.
   * @param {Object} missionData - Datos a actualizar.
   * @returns {Promise<Object>} Datos de la misión actualizada.
   */
  update: async (id, missionData) => {
    const response = await httpClient.put(`/missions/${id}`, missionData);
    return response.data;
  },

  /**
   * Elimina una misión.
   * @param {number|string} id - Identificador de la misión.
   * @returns {Promise<void>}
   */
  delete: async (id) => {
    await httpClient.delete(`/missions/${id}`);
  },

  /**
   * Inicia la ejecución de una misión.
   * @param {number|string} missionId - Identificador de la misión.
   * @returns {Promise<Object>} Datos de la ejecución iniciada.
   */
  startRun: async (missionId) => {
    const response = await httpClient.post(`/missions/${missionId}/runs`);
    return response.data;
  }
};
