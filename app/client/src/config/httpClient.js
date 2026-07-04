import axios from "axios";
import { toast } from "sonner";
import i18n from "../i18n/index.js";

/**
 * Cliente HTTP centralizado para la aplicación mediante Axios.
 * Configura la base URL y los interceptores de seguridad.
 * @type {import("axios").AxiosInstance}
 */
const instance = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

const httpClient = instance || axios;

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

httpClient.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error)
);

const handleApiError = (error) => {
  if (error.response?.data) {
    const { errorCode, error: message, details } = error.response.data;
    
    if (errorCode === "VALIDATION_ERROR" && details && details.length > 0) {
      details.forEach(detail => {
        toast.warning(i18n.t(detail.message));
      });
    } else if (errorCode && i18n.exists(`errors.${errorCode}`)) {
      toast.error(i18n.t(`errors.${errorCode}`));
    } else if (message) {
      toast.error(message);
    } else {
      toast.error(i18n.t("errors.UNKNOWN_ERROR"));
    }
  } else {
    toast.error(i18n.t("errors.SERVICE_UNAVAILABLE"));
  }
};

httpClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      const url = originalRequest.url || "";
      if (url.includes("/auth/login") || url.includes("/auth/refresh") || url.includes("/auth/logout")) {
        throw error;
      }

      if (isRefreshing) {
        await new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        });
        return await httpClient(originalRequest);
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await httpClient.post("/auth/refresh");
        processQueue(null);
        return await httpClient(originalRequest);
      } catch (err) {
        processQueue(err, null);
        throw err;
      } finally {
        isRefreshing = false;
      }
    }

    handleApiError(error);
    throw error;
  }
);

export default httpClient;