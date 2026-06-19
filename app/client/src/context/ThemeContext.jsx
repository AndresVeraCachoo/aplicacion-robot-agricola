/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useState, useEffect, useContext, useMemo, useCallback } from "react";
import PropTypes from "prop-types";

/**
 * Contexto global para preferencias visuales (modo oscuro/claro).
 * @type {React.Context<any>}
 */
const ThemeContext = createContext();

/**
 * Hook para acceder a los valores del tema visual.
 * @returns {{isDarkMode: boolean, toggleTheme: function}}
 */
export function useTheme() {
  return useContext(ThemeContext);
}

/**
 * Proveedor del tema visual (claro/oscuro).
 * @param {Object} props - Propiedades del componente.
 * @param {React.ReactNode} props.children - Árbol de la aplicación.
 * @returns {JSX.Element}
 */
export function ThemeProvider({ children }) {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem("theme");
    return savedTheme === "dark";
  });

  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add("dark-mode");
      localStorage.setItem("theme", "dark");
    } else {
      document.body.classList.remove("dark-mode");
      localStorage.setItem("theme", "light");
    }
  }, [isDarkMode]);

  const toggleTheme = useCallback(function handleToggleTheme() {
    setIsDarkMode((prev) => !prev);
  }, []);

  const contextValue = useMemo(
    () => ({ isDarkMode, toggleTheme }),
    [isDarkMode, toggleTheme]
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

ThemeProvider.propTypes = {
  children: PropTypes.node.isRequired,
};