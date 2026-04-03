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
const API_URL = "http://localhost:3001/api";

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [userRole, setUserRole] = useState(() =>
    localStorage.getItem("userRole"),
  );
  const [isLoggedIn, setIsLoggedIn] = useState(
    () => !!localStorage.getItem("token"),
  );
  const navigate = useNavigate();

  // El Efecto Centinela (Para el arranque de la app)
  useEffect(() => {
    const verifyAuthStatus = async () => {
      if (token) {
        try {
          axios.defaults.headers.common["Authorization"] = "Bearer " + token;
          await axios.get(`${API_URL}/auth/verify`);
          setIsLoggedIn(true);
        } catch (error) {
          console.warn("Sesión caducada. Detalle:", error.message);
          delete axios.defaults.headers.common["Authorization"];
          localStorage.removeItem("token");
          localStorage.removeItem("userRole");
          setToken(null);
          setUserRole(null);
          setIsLoggedIn(false);
          navigate("/login");
        }
      } else {
        delete axios.defaults.headers.common["Authorization"];
        localStorage.removeItem("token");
        localStorage.removeItem("userRole");
        setIsLoggedIn(false);
      }
    };

    verifyAuthStatus();
  }, [token, navigate]);

  const login = useCallback(
    async (name, password) => {
      try {
        const response = await axios.post(`${API_URL}/auth/login`, {
          name,
          password,
        });

        if (response.data.token) {
          const { token: newToken, user } = response.data;
          localStorage.setItem("token", newToken);
          localStorage.setItem("userRole", user.role);
          axios.defaults.headers.common["Authorization"] = "Bearer " + newToken;

          setToken(newToken);
          setUserRole(user.role);
          setIsLoggedIn(true);
          navigate("/app");
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

  const logout = useCallback(() => {
    delete axios.defaults.headers.common["Authorization"];
    localStorage.removeItem("token");
    localStorage.removeItem("userRole");
    setToken(null);
    setUserRole(null);
    setIsLoggedIn(false);
    navigate("/login");
  }, [navigate]);

  // 3. TAREA CERRADA: INTERCEPTOR AXIOS (El cazador de tokens caducados en vuelo)
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        // Si el servidor responde 401 (No autorizado) o 403 (Prohibido)
        if (
          error.response &&
          (error.response.status === 401 || error.response.status === 403)
        ) {
          const url = error.config.url || "";
          // Ignoramos los endpoints de login y verify para evitar bucles de navegación
          if (!url.includes("/auth/login") && !url.includes("/auth/verify")) {
            console.warn(
              "Interceptor: Token caducado detectado enviando petición. Cerrando sesión forzosamente...",
            );
            logout();
          }
        }
        return Promise.reject(error);
      },
    );

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
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
