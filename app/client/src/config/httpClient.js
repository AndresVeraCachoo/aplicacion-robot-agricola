import axios from "axios";

/**
 * Cliente HTTP centralizado para la aplicación mediante Axios.
 * Configura la base URL y los interceptores de seguridad.
 * @type {import("axios").AxiosInstance}
 */
const instance = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

const httpClient = instance || axios;

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