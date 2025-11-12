// src/context/AuthContext.jsx
import React, { createContext, useState } from "react";
import { useNavigate } from "react-router-dom";

// 1. Exporta el AuthContext para que el hook pueda importarlo
export const AuthContext = createContext(null);

// 2. Este es el COMPONENTE Proveedor. Solo exporta esto.
export function AuthProvider({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState(null); // <-- NUEVO ESTADO PARA EL ROL
  const navigate = useNavigate();

  // 3. Login ahora acepta un ROL
  const login = (role) => {
    setIsLoggedIn(true);
    setUserRole(role); // <-- GUARDAMOS EL ROL
    navigate("/app");
  };

  const logout = () => {
    setIsLoggedIn(false);
    setUserRole(null); // <-- LIMPIAMOS EL ROL
    navigate("/login");
  };

  // 4. Exponemos el userRole en el contexto
  return (
    <AuthContext.Provider value={{ isLoggedIn, userRole, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
