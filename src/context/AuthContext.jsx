// src/context/AuthContext.jsx
import React, { createContext, useState } from "react";
import { useNavigate } from "react-router-dom";

// 1. Exporta el AuthContext para que el hook pueda importarlo
export const AuthContext = createContext(null);

// 2. Este es el COMPONENTE Proveedor. Solo exporta esto.
export function AuthProvider({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const navigate = useNavigate();

  const login = () => {
    setIsLoggedIn(true);
    navigate("/app");
  };

  const logout = () => {
    setIsLoggedIn(false);
    navigate("/login");
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
