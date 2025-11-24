// src/context/ToastContext.jsx
import React, { createContext, useState, useContext, useCallback } from "react";
import "./ToastContext.css";

// Creamos el contexto
const ToastContext = createContext(null);

// Hook personalizado para usar el contexto
// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast debe ser usado dentro de un ToastProvider");
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  // Definimos removeToast PRIMERO para poder usarlo en addToast si fuera necesario,
  // o simplemente usamos setState funcional para evitar dependencias circulares.
  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback((message, type = "info") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto-eliminar
    setTimeout(() => {
      // Usamos el callback funcional de setState dentro de removeToast,
      // pero como removeToast ya es estable (por useCallback), podemos llamarlo directo.
      // Sin embargo, para evitar la dependencia en este callback específico,
      // podemos hacer la lógica de eliminación aquí mismo o incluir removeToast en deps.

      // Opción más limpia para el linter: llamar a la función de estado directamente
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);
  // Nota: Al usar setToasts dentro, no necesitamos depender de 'removeToast' en addToast

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
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
};
