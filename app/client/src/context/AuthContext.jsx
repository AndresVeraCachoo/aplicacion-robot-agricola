// src/context/AuthContext.jsx
/* eslint-disable react-refresh/only-export-components */
import React, {
  createContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export const AuthContext = createContext(null);
const API_URL = import.meta.env.VITE_API_URL;

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [userRole, setUserRole] = useState(() =>
    localStorage.getItem("userRole"),
  );
  const [isLoggedIn, setIsLoggedIn] = useState(
    () => !!localStorage.getItem("token"),
  );
  const navigate = useNavigate();

  // Función de Logout 
  const logout = useCallback(() => {
    delete axios.defaults.headers.common["Authorization"];
    localStorage.removeItem("token");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userName");
    localStorage.removeItem("userAvatar");
    setToken(null);
    setUserRole(null);
    setIsLoggedIn(false);
    navigate("/login");
  }, [navigate]);

  // 2. Efecto Centinela
  useEffect(() => {
    const verifyAuthStatus = async () => {
      if (token) {
        try {
          axios.defaults.headers.common["Authorization"] = "Bearer " + token;
          await axios.get(`${API_URL}/auth/verify`);
          setIsLoggedIn(true);
        } catch (error) {
          console.warn("Sesión caducada. Detalle:", error.message);
          logout();
        }
      } else {
        delete axios.defaults.headers.common["Authorization"];
        setIsLoggedIn(false);
      }
    };
    verifyAuthStatus();
  }, [token, logout]);

  // 1. Función de Login
  const login = useCallback(
    async (name, password) => {
      try {
        const response = await axios.post(`${API_URL}/auth/login`, {
          name,
          password,
        });

        if (response.data.token) {
          const { token: newToken, user } = response.data;

          // Validación estricta del Token mediante Regex (Fix para Sonar)
          const jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/;
          if (typeof newToken !== "string" || !jwtRegex.test(newToken)) {
            throw new Error("El servidor devolvió un token con formato inválido");
          }

          // Descontaminación del Rol
          let safeRole = "usuario";
          if (user?.role === "admin") {
            safeRole = "admin";
          } else if (user?.role === "operador") {
            safeRole = "operador";
          }

          // --- LÓGICA DE SANITIZACIÓN ---
          
          // Sanitización del Nombre (Evita inyección de scripts eliminando caracteres especiales)
          let safeName = "Usuario";
          if (typeof response.data.user.name === "string") {
            safeName = response.data.user.name.replaceAll(/[^a-zA-Z0-9 áéíóúÁÉÍÓÚñÑ]/g, "");
          }

          // Sanitización del Avatar (Comprueba protocolo o ruta local)
          let safeAvatar = "/avatars/robot-fondo-verde.png";
          const rawAvatar = response.data.user.avatar;
          if (typeof rawAvatar === "string" && (rawAvatar.startsWith("http") || rawAvatar.startsWith("/"))) {
            safeAvatar = rawAvatar;
          }

          // Guardamos los datos LIMPIOS en el navegador
          localStorage.setItem("token", newToken);
          localStorage.setItem("userRole", safeRole);
          localStorage.setItem("userName", safeName);
          localStorage.setItem("userAvatar", safeAvatar);

          // Avisamos a la Sidebar
          globalThis.dispatchEvent(new Event("avatarUpdated"));

          axios.defaults.headers.common["Authorization"] = "Bearer " + newToken;
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
    [navigate],
  );

  // INTERCEPTOR AXIOS
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
          const url = error.config.url || "";
          if (!url.includes("/auth/login") && !url.includes("/auth/verify")) {
            logout();
          }
        }
        return Promise.reject(error);
      },
    );
    return () => axios.interceptors.response.eject(interceptor);
  }, [logout]);

  const contextValue = useMemo(
    () => ({ isLoggedIn, userRole, login, logout }),
    [isLoggedIn, userRole, login, logout],
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};