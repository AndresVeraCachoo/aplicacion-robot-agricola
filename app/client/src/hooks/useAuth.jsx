// src/hooks/useAuth.js
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

/**
 * Hook personalizado para acceder al contexto de autenticación.
 * Proporciona acceso a las funciones de login, logout y datos del usuario actual.
 * @returns {Object} Contexto de autenticación.
 * @throws {Error} Si se usa fuera de un AuthProvider.
 */
export const useAuth = () => {
  const context = useContext(AuthContext);

  if (context === null) {
    throw new Error("useAuth() debe ser usado dentro de un AuthProvider");
  }

  return context;
};
