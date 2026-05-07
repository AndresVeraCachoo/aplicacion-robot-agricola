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
          console.warn("Sesión caducada:", error.message);
          logout();
        }
      }
    };
    verifyAuthStatus();
  }, [token, logout]);

  // Función de Login con Persistencia de Avatar
  const login = useCallback(
    async (name, password) => {
      try {
        const response = await axios.post(`${API_URL}/auth/login`, {
          name,
          password,
        });

        if (response.data.token) {
          const { token: newToken, user } = response.data;

          // Validación Sonar S8475
          const jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/;
          if (typeof newToken !== "string" || !jwtRegex.test(newToken)) {
            throw new Error("Token con formato inválido");
          }

          // Sanitización de Rol
          let safeRole = "usuario";
          if (user?.role === "admin") safeRole = "admin";
          else if (user?.role === "operador") safeRole = "operador";

          localStorage.setItem("token", newToken);
          localStorage.setItem("userRole", safeRole);
          localStorage.setItem("userName", user.name || "");
          localStorage.setItem("userAvatar", user.avatar || "/avatars/robot-fondo-verde.png");

          // Avisamos a la Sidebar de que los datos han cambiado
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