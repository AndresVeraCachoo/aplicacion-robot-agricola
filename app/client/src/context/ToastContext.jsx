/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useCallback, useMemo } from "react";
import PropTypes from "prop-types";
import { Toaster, toast as sonnerToast } from "sonner";
import "./ToastContext.css"; // Keep for backwards compatibility if needed, or clear it out

const ToastContext = createContext(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

export function ToastProvider({ children }) {
  const addToast = useCallback((message, type = "info") => {
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
  }, []);

  const removeToast = useCallback((id) => {
    sonnerToast.dismiss(id);
  }, []);

  const contextValue = useMemo(() => ({ addToast, removeToast }), [addToast, removeToast]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <Toaster position="bottom-right" richColors closeButton />
    </ToastContext.Provider>
  );
}

ToastProvider.propTypes = {
  children: PropTypes.node.isRequired,
};