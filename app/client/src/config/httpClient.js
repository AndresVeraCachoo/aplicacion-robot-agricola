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

httpClient.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error)
);

httpClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const url = error.config?.url || "";
      if (url.includes("/auth/verify") || url.includes("/auth/logout")) {
        return Promise.reject(error);
      }
    }

    if (error.response && error.response.data) {
      const { errorCode, error: message, details } = error.response.data;
      
      if (errorCode === "VALIDATION_ERROR" && details && details.length > 0) {
        // Para cada error de validación, intentar traducirlo y mostrar un toast
        details.forEach(detail => {
          const translatedMsg = i18n.t(detail.message);
          // Opcionalmente podemos mostrar el campo, pero si el mensaje es claro, no hace falta
          toast.warning(translatedMsg);
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
    return Promise.reject(error);
  }
);

export default httpClient;