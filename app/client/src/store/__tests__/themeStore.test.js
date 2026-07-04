import { describe, it, expect, beforeEach } from 'vitest';
import { useThemeStore } from '../themeStore';

describe('useThemeStore', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.className = '';
    // Reseteamos el store al estado inicial basado en localStorage (que ahora está limpio)
    useThemeStore.setState({ isDarkMode: false });
  });

  it('debería inicializarse con el tema claro por defecto', () => {
    const isDarkMode = useThemeStore.getState().isDarkMode;
    expect(isDarkMode).toBe(false);
  });

  it('debería alternar el tema a oscuro', () => {
    useThemeStore.getState().toggleTheme();
    
    expect(useThemeStore.getState().isDarkMode).toBe(true);
    expect(localStorage.getItem('theme')).toBe('dark');
    expect(document.body.classList.contains('dark-mode')).toBe(true);
  });

  it('debería alternar el tema de oscuro a claro', () => {
    useThemeStore.setState({ isDarkMode: true });
    document.body.classList.add('dark-mode');
    
    useThemeStore.getState().toggleTheme();
    
    expect(useThemeStore.getState().isDarkMode).toBe(false);
    expect(localStorage.getItem('theme')).toBe('light');
    expect(document.body.classList.contains('dark-mode')).toBe(false);
  });
});
