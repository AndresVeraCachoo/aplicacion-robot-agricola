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

  // El Efecto Centinela
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

  // Función de Login con Sanitización Estricta (Fix para Sonar S8475)
  const login = useCallback(
    async (name, password) => {
      try {
        const response = await axios.post(`${API_URL}/auth/login`, {
          name,
          password,
        });

        if (response.data.token) {
          const { token: newToken, user } = response.data;

          // Validación estricta del Token mediante Regex
          const jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/;
          if (typeof newToken !== "string" || !jwtRegex.test(newToken)) {
            throw new Error(
              "El servidor devolvió un token con formato inválido",
            );
          }

          // Descontaminación del Rol
          let safeRole = "usuario";
          if (user?.role === "admin") {
            safeRole = "admin";
          } else if (user?.role === "operador") {
            safeRole = "operador";
          }

          // Guardamos los datos limpios en el navegador
          localStorage.setItem("token", newToken);
          localStorage.setItem("userRole", safeRole);
          axios.defaults.headers.common["Authorization"] = "Bearer " + newToken;

          setToken(newToken);
          setUserRole(safeRole);
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

  // 3. Función de Logout
  const logout = useCallback(() => {
    delete axios.defaults.headers.common["Authorization"];
    localStorage.removeItem("token");
    localStorage.removeItem("userRole");
    setToken(null);
    setUserRole(null);
    setIsLoggedIn(false);
    navigate("/login");
  }, [navigate]);

  // INTERCEPTOR AXIOS
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
