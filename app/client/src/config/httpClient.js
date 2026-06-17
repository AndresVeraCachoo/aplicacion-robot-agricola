import axios from "axios";

/**
 * @namespace Configuracion
 * @description Ajustes globales y utilidades de infraestructura del cliente.
 */

/**
 * Cliente HTTP centralizado de la aplicación.
 * @type {import("axios").AxiosInstance}
 * @memberof Configuracion
 * @name httpClient
 */
const httpClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

httpClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default httpClient;