import { create } from 'zustand';
import { toast as sonnerToast } from 'sonner';

/**
 * Gestor de notificaciones globales usando Zustand (envuelve a Sonner).
 */
export const useToastStore = create(() => ({
  /**
   * Añade una notificación.
   * @param {string} message - Mensaje a mostrar.
   * @param {string} type - Tipo (info, success, error, warning).
   */
  addToast: (message, type = "info") => {
    switch (type) {
      case "success":
        sonnerToast.success(message);
        break;
      case "error":
        sonnerToast.error(message);
        break;
      case "warning":
        sonnerToast.warning(message);
        break;
      case "info":
      default:
        sonnerToast.info(message);
        break;
    }
  },

  /**
   * Elimina una notificación por su ID.
   * @param {number|string} id - ID de la notificación.
   */
  removeToast: (id) => {
    sonnerToast.dismiss(id);
  }
}));
