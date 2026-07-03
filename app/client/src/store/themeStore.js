import { create } from 'zustand';

/**
 * Gestor de estado global para preferencias visuales (modo oscuro/claro) usando Zustand.
 */
export const useThemeStore = create((set, get) => ({
  isDarkMode: (() => {
    const savedTheme = localStorage.getItem("theme");
    const isDark = savedTheme === "dark";
    if (isDark) {
      document.body.classList.add("dark-mode");
    } else {
      document.body.classList.remove("dark-mode");
    }
    return isDark;
  })(),

  /**
   * Alterna el tema visual (claro/oscuro).
   */
  toggleTheme: () => {
    const { isDarkMode } = get();
    const newDarkMode = !isDarkMode;
    
    set({ isDarkMode: newDarkMode });
    
    if (newDarkMode) {
      document.body.classList.add("dark-mode");
      localStorage.setItem("theme", "dark");
    } else {
      document.body.classList.remove("dark-mode");
      localStorage.setItem("theme", "light");
    }
  }
}));
