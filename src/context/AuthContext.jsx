// src/context/AuthContext.jsx
import React, { createContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export const AuthContext = createContext(null);
const API_URL = "http://localhost:3001/api";

export function AuthProvider({ children }) {
  // 1. INICIALIZACIÓN SINCRÓNICA (La clave del arreglo)
  // Leemos el localStorage INMEDIATAMENTE, antes de que se renderice nada.
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [userRole, setUserRole] = useState(() =>
    localStorage.getItem("userRole")
  );

  // Si hay token al arrancar, empezamos logueados desde el milisegundo 0
  const [isLoggedIn, setIsLoggedIn] = useState(
    () => !!localStorage.getItem("token")
  );

  const navigate = useNavigate();

  // 2. Efecto para configurar Axios (se ejecuta al cambiar el token)
  useEffect(() => {
    if (token) {
      // Si tenemos token, se lo pegamos a axios para todas las peticiones
      axios.defaults.headers.common["Authorization"] = "Bearer " + token;

      // Nos aseguramos de que el estado esté sincronizado
      localStorage.setItem("token", token);
      if (userRole) localStorage.setItem("userRole", userRole);
      setIsLoggedIn(true);
    } else {
      // Si no hay token, limpiamos cabeceras y storage
      delete axios.defaults.headers.common["Authorization"];
      localStorage.removeItem("token");
      localStorage.removeItem("userRole");
      setIsLoggedIn(false);
    }
  }, [token, userRole]);

  const login = async (name, password) => {
    try {
      const response = await axios.post(`${API_URL}/login`, { name, password });

      if (response.data.token) {
        const { token: newToken, user } = response.data;

        // Actualizamos estados (el useEffect se encargará del resto)
        setToken(newToken);
        setUserRole(user.role);

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
  };

  const logout = () => {
    setToken(null);
    setUserRole(null);
    setIsLoggedIn(false);
    navigate("/login");
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, userRole, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
