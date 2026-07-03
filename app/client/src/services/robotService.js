import httpClient from "../config/httpClient";

/**
 * Servicio del robot.
 * Centraliza las llamadas a la API relacionadas con el control y telemetría del robot.
 */
export const robotService = {
  /**
   * Obtiene el estado actual del robot.
   * @returns {Promise<Object>} Datos de estado.
   */
  getStatus: async () => {
    const response = await httpClient.get("/robot/estado");
    return response.data;
  },

  /**
   * Obtiene la configuración actual del robot.
   * @returns {Promise<Object>} Configuración del robot.
   */
  getConfig: async () => {
    const response = await httpClient.get("/robot/config");
    return response.data;
  },

  /**
   * Actualiza la configuración del robot.
   * @param {Object} config - Nueva configuración.
   * @returns {Promise<Object>} Configuración actualizada.
   */
  updateConfig: async (config) => {
    const response = await httpClient.put("/robot/config", config);
    return response.data;
  },

  /**
   * Obtiene el historial de energía.
   * @param {string} [start] - Fecha de inicio.
   * @param {string} [end] - Fecha de fin.
   * @returns {Promise<Object>} Datos de energía.
   */
  getEnergy: async (start, end, misionId) => {
    const params = new URLSearchParams();
    if (start && end) {
      params.append("start", start);
      params.append("end", end);
    }
    if (misionId) {
      params.append("misionId", misionId);
    }
    const response = await httpClient.get(`/robot/energia/historial?${params.toString()}`);
    return response.data;
  },

  /**
   * Obtiene los datos agronómicos históricos.
   * @param {string} [start] - Fecha de inicio.
   * @param {string} [end] - Fecha de fin.
   * @param {number|string} [missionId] - ID de misión opcional.
   * @returns {Promise<Array<Object>>} Datos agronómicos.
   */
  getAgronomicData: async (start, end, missionId) => {
    const params = new URLSearchParams();
    if (start && end) {
      params.append("start", start);
      params.append("end", end);
    }
    if (missionId) {
      params.append("misionId", missionId);
    }
    const response = await httpClient.get(`/robot/datos?${params.toString()}`);
    return response.data;
  },

  /**
   * Inicia el modo automático del robot.
   * @returns {Promise<void>}
   */
  start: async () => {
    await httpClient.post("/robot/start");
  },

  /**
   * Detiene el robot.
   * @returns {Promise<void>}
   */
  stop: async () => {
    await httpClient.post("/robot/stop");
  },

  /**
   * Ordena al robot regresar a la base (RTL).
   * @returns {Promise<void>}
   */
  returnToBase: async () => {
    await httpClient.post("/robot/return");
  },

  /**
   * Reinicia los sistemas del robot.
   * @returns {Promise<void>}
   */
  reset: async () => {
    await httpClient.post("/robot/reset");
  },

  /**
   * Envía un comando manual de movimiento.
   * @param {Object} command - Comando de movimiento.
   * @returns {Promise<void>}
   */
  manualControl: async (command) => {
    await httpClient.post("/robot/manual-control", command);
  },

  /**
   * Elimina los datos de sesión actual.
   * @returns {Promise<void>}
   */
  deleteSessionData: async () => {
    await httpClient.delete("/robot/session");
  }
};
