// src/context/AuthContext.jsx
import React, { createContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios"; // 1. Importa axios

export const AuthContext = createContext(null);
const API_URL = "http://localhost:3001/api"; // URL de tu backend

export function AuthProvider({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const navigate = useNavigate();

  // 2. 'login' ahora es asíncrono y acepta 'name' y 'password'
  const login = async (name, password) => {
    try {
      // 3. Llama a tu API
      const response = await axios.post(`${API_URL}/login`, {
        name,
        password,
      });

      // 4. Si la API responde bien, guarda el rol de la DB
      if (response.data && response.data.role) {
        setIsLoggedIn(true);
        setUserRole(response.data.role); // Guarda el rol
        navigate("/app");
        return { success: true };
      }
    } catch (error) {
      console.error(
        "Error de login:",
        error.response?.data?.error || error.message
      );
      setIsLoggedIn(false);
      setUserRole(null);
      // Devuelve el error para mostrarlo en el formulario
      return {
        success: false,
        message: error.response?.data?.error || "Error al conectar",
      };
    }
  };

  const logout = () => {
    setIsLoggedIn(false);
    setUserRole(null);
    navigate("/login");
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, userRole, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
