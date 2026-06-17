import React, { createContext, useState, useEffect, useMemo, useCallback } from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import httpClient from "../config/httpClient";

/**
 * @namespace Contextos
 * @description Proveedores de estado global mediante la API de Context de React.
 */

/**
 * Instancia del contexto global para la gestión de la sesión del usuario.
 * @type {React.Context<any>}
 * @memberof Contextos
 * @name AuthContext
 */
export const AuthContext = createContext(null);

/**
 * Proveedor de autenticación.
 * Coordina el estado local de la sesión con los datos almacenados en el navegador.
 * @function AuthProvider
 * @memberof Contextos
 * @param {Object} props - Propiedades del componente.
 * @param {React.ReactNode} props.children - Árbol de la aplicación.
 * @returns {JSX.Element}
 */
export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [userRole, setUserRole] = useState(() => localStorage.getItem("userRole"));
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!localStorage.getItem("token"));
  const navigate = useNavigate();

  const logout = useCallback(function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userName");
    localStorage.removeItem("userAvatar");
    setToken(null);
    setUserRole(null);
    setIsLoggedIn(false);
    navigate("/login");
  }, [navigate]);

  useEffect(() => {
    async function verifyAuthStatus() {
      if (token) {
        try {
          await httpClient.get("/auth/verify");
          setIsLoggedIn(true);
        } catch (error) {
          console.warn("Sesión caducada. Detalle:", error.message);
          logout();
        }
      } else {
        setIsLoggedIn(false);
      }
    }
    verifyAuthStatus();
  }, [token, logout]);

  const login = useCallback(
    async function handleLogin(name, password) {
      try {
        const response = await httpClient.post("/auth/login", { name, password });

        if (response.data.token) {
          const { token: newToken, user } = response.data;

          const jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/;
          if (typeof newToken !== "string" || !jwtRegex.test(newToken)) {
            throw new Error("El servidor devolvió un token con formato inválido");
          }

          let safeRole = "usuario";
          if (user?.role === "admin") {
            safeRole = "admin";
          } else if (user?.role === "operador") {
            safeRole = "operador";
          }

          let safeName = "Usuario";
          const rawName = response.data.user?.name;
          const nameRegex = /^[a-zA-Z0-9 áéíóúÁÉÍÓÚñÑ]+$/;
          if (typeof rawName === "string" && nameRegex.test(rawName)) {
            safeName = rawName;
          }

          let safeAvatar = "/avatars/robot-fondo-verde.png";
          const rawAvatar = response.data.user?.avatar;
          const avatarRegex = /^(\/[a-zA-Z0-9-_./]+|https?:\/\/[a-zA-Z0-9-_./]+)$/;
          if (typeof rawAvatar === "string" && avatarRegex.test(rawAvatar)) {
            safeAvatar = rawAvatar;
          }

          localStorage.setItem("token", newToken);
          localStorage.setItem("userRole", safeRole);
          localStorage.setItem("userName", safeName);
          localStorage.setItem("userAvatar", safeAvatar);

          globalThis.dispatchEvent(new Event("avatarUpdated"));

          setToken(newToken);
          setUserRole(safeRole);
          setIsLoggedIn(true);
          
          navigate("/app/dashboard");
          return { success: true };
        }
      } catch (error) {
        console.error("Error de login:", error);
        return {
          success: false,
          message: error.response?.data?.error || "Error al conectar",
        };
      }
    },
    [navigate]
  );

  useEffect(() => {
    const interceptor = httpClient.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
          const url = error.config.url || "";
          if (!url.includes("/auth/login") && !url.includes("/auth/verify")) {
            logout();
          }
        }
        return Promise.reject(error);
      }
    );
    return () => httpClient.interceptors.response.eject(interceptor);
  }, [logout]);

  const contextValue = useMemo(
    () => ({ isLoggedIn, userRole, login, logout }),
    [isLoggedIn, userRole, login, logout]
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};