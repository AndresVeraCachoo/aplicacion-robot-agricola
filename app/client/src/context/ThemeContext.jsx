import React, { createContext, useState, useEffect, useContext, useMemo, useCallback } from "react";
import PropTypes from "prop-types";

/**
 * Instancia del contexto para las preferencias visuales.
 * @type {React.Context<any>}
 * @memberof Contextos
 * @name ThemeContext
 */
const ThemeContext = createContext();

/**
 * Atajo para acceder a los valores del tema.
 * @function useTheme
 * @memberof Contextos
 * @returns {{isDarkMode: boolean, toggleTheme: function}}
 */
export function useTheme() {
  return useContext(ThemeContext);
}

/**
 * Proveedor del tema visual (claro/oscuro).
 * @function ThemeProvider
 * @memberof Contextos
 * @param {Object} props
 * @param {React.ReactNode} props.children
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