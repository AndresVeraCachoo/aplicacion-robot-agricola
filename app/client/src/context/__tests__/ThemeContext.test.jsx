import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ThemeProvider, useTheme } from '../ThemeContext.jsx';

const ThemeTestComponent = () => {
  const { isDarkMode, toggleTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme-status">{isDarkMode ? 'dark' : 'light'}</span>
      <button onClick={toggleTheme}>Toggle</button>
    </div>
  );
};

describe('gestión del tema visual', () => {
  beforeEach(() => {
    globalThis.localStorage.clear();
    document.body.className = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('debería inicializar en modo claro de forma predeterminada', () => {
    render(
      <ThemeProvider>
        <ThemeTestComponent />
      </ThemeProvider>
    );

    expect(screen.getByTestId('theme-status').textContent).toBe('light');
    expect(document.body.classList.contains('dark-mode')).toBe(false);
    expect(globalThis.localStorage.getItem('theme')).toBe('light');
  });

  it('debería aplicar el modo oscuro al arranque si está guardado en memoria', () => {
    globalThis.localStorage.setItem('theme', 'dark');

    render(
      <ThemeProvider>
        <ThemeTestComponent />
      </ThemeProvider>
    );

    expect(screen.getByTestId('theme-status').textContent).toBe('dark');
    expect(document.body.classList.contains('dark-mode')).toBe(true);
  });

  it('debería alternar los colores mutando la clase raíz del dom al pulsar el botón', () => {
    render(
      <ThemeProvider>
        <ThemeTestComponent />
      </ThemeProvider>
    );

    const button = screen.getByText('Toggle');

    act(() => {
      button.click();
    });

    expect(screen.getByTestId('theme-status').textContent).toBe('dark');
    expect(document.body.classList.contains('dark-mode')).toBe(true);
    expect(globalThis.localStorage.getItem('theme')).toBe('dark');

    act(() => {
      button.click();
    });

    expect(screen.getByTestId('theme-status').textContent).toBe('light');
    expect(document.body.classList.contains('dark-mode')).toBe(false);
    expect(globalThis.localStorage.getItem('theme')).toBe('light');
  });
});