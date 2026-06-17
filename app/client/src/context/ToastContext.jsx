import React, { createContext, useState, useContext, useCallback, useMemo } from "react";
import PropTypes from "prop-types";
import "./ToastContext.css";

/**
 * Instancia del contexto de notificaciones.
 * @type {React.Context<any>}
 * @memberof Contextos
 * @name ToastContext
 */
const ToastContext = createContext(null);

/**
 * Hook para despachar notificaciones emergentes.
 * @function useToast
 * @memberof Contextos
 * @throws {Error} Si se usa fuera de los límites de un ToastProvider.
 * @returns {{addToast: function, removeToast: function}}
 */
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast debe ser usado dentro de un ToastProvider");
  }
  return context;
}

/**
 * Proveedor del sistema de notificaciones temporales.
 * @function ToastProvider
 * @memberof Contextos
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @returns {JSX.Element}
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback(function handleRemoveToast(id) {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback(
    function handleAddToast(message, type = "info") {
      const id = Date.now();
      setToasts((prev) => [...prev, { id, message, type }]);

      setTimeout(() => {
        removeToast(id);
      }, 3500);
    },
    [removeToast]
  );

  const contextValue = useMemo(
    () => ({ addToast, removeToast }),
    [addToast, removeToast]
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}

      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            <span className="toast-icon">
              {toast.type === "success" && "✅"}
              {toast.type === "error" && "🚨"}
              {toast.type === "warning" && "⚠️"}
              {toast.type === "info" && "ℹ️"}
            </span>
            <span className="toast-message">{toast.message}</span>
            <button
              type="button"
              className="toast-close"
              onClick={() => removeToast(toast.id)}
            >
              &times;
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

ToastProvider.propTypes = {
  children: PropTypes.node.isRequired,
};