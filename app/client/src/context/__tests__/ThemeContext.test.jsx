import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ThemeProvider, useTheme } from '../ThemeContext.jsx';

// Componente de prueba para consumir el hook
const ThemeTestComponent = () => {
  const { isDarkMode, toggleTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme-status">{isDarkMode ? 'dark' : 'light'}</span>
      <button onClick={toggleTheme}>Toggle</button>
    </div>
  );
};

describe('ThemeContext', () => {
  beforeEach(() => {
    // Limpiamos el localStorage y el body antes de cada test
    globalThis.localStorage.clear();
    document.body.className = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('inicia en modo claro por defecto si no hay nada en localStorage', () => {
    render(
      <ThemeProvider>
        <ThemeTestComponent />
      </ThemeProvider>
    );

    expect(screen.getByTestId('theme-status').textContent).toBe('light');
    expect(document.body.classList.contains('dark-mode')).toBe(false);
    expect(globalThis.localStorage.getItem('theme')).toBe('light');
  });

  it('inicia en modo oscuro si está guardado en localStorage', () => {
    globalThis.localStorage.setItem('theme', 'dark');

    render(
      <ThemeProvider>
        <ThemeTestComponent />
      </ThemeProvider>
    );

    expect(screen.getByTestId('theme-status').textContent).toBe('dark');
    expect(document.body.classList.contains('dark-mode')).toBe(true);
  });

  it('cambia el tema y actualiza localStorage y document.body al ejecutar toggleTheme', () => {
    render(
      <ThemeProvider>
        <ThemeTestComponent />
      </ThemeProvider>
    );

    const button = screen.getByText('Toggle');

    // Cambiar a Dark
    act(() => {
      button.click();
    });

    expect(screen.getByTestId('theme-status').textContent).toBe('dark');
    expect(document.body.classList.contains('dark-mode')).toBe(true);
    expect(globalThis.localStorage.getItem('theme')).toBe('dark');

    // Volver a Light
    act(() => {
      button.click();
    });

    expect(screen.getByTestId('theme-status').textContent).toBe('light');
    expect(document.body.classList.contains('dark-mode')).toBe(false);
    expect(globalThis.localStorage.getItem('theme')).toBe('light');
  });
});