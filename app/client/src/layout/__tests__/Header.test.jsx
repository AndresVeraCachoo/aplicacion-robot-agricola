import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Header from '../Header.jsx';
import { useRobotStore } from '../../store/robotStore';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';

// Mock de i18next ajustado a la lógica de promesas de tu componente
let currentLang = 'es';
const mockChangeLanguage = vi.fn((lang) => {
  currentLang = lang;
  return Promise.resolve(); // Simula la promesa que espera tu componente en el .then()
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k) => k,
    i18n: {
      get language() { return currentLang; },
      get resolvedLanguage() { return currentLang; },
      changeLanguage: mockChangeLanguage,
      getFixedT: () => (k) => k, // Simula la función para traducir el toast
    },
  }),
}));

vi.mock('../../context/ToastContext', () => ({
  useToast: vi.fn(),
}));

vi.mock('../../store/robotStore', () => ({ useRobotStore: vi.fn() }));
vi.mock('../../context/ThemeContext', () => ({ useTheme: vi.fn() }));

vi.mock('../../components/Modal', () => ({
  default: ({ isOpen, onClose, children }) => (
    isOpen ? (
      <div data-testid="mock-modal">
        {children}
        <button onClick={onClose}>Close Modal</button>
      </div>
    ) : null
  ),
}));

vi.mock('../../features/dashboard/components/BatteryModal', () => ({
  default: () => <div data-testid="mock-battery-modal">Battery Content</div>,
}));

describe('Header Component', () => {
  const mockOnMenuClick = vi.fn();
  const mockToggleTheme = vi.fn();
  const mockAddToast = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    currentLang = 'es';
    useTheme.mockReturnValue({ isDarkMode: false, toggleTheme: mockToggleTheme });
    useToast.mockReturnValue({ addToast: mockAddToast });
  });

  // Ajustado para mockear netPower e isConnected y cubrir todas las ramas
  const setupStore = (percentage, status, netPower = 0, isConnected = true) => {
    useRobotStore.mockImplementation((selector) => {
      const state = { battery: { percentage, status, netPower }, isConnected };
      return typeof selector === 'function' ? selector(state) : state;
    });
  };

  it('renderiza correctamente el Header e interacciona con el menú', () => {
    setupStore(80, 'DISCHARGING');
    render(<Header onMenuClick={mockOnMenuClick} />);

    const menuBtn = document.querySelector('.menu-button');
    fireEvent.click(menuBtn);
    expect(mockOnMenuClick).toHaveBeenCalledTimes(1);
  });

  describe('Estado de Conexión', () => {
    it('muestra el estado desconectado', () => {
      setupStore(80, 'DISCHARGING', 0, false);
      render(<Header onMenuClick={mockOnMenuClick} />);
      expect(screen.getByText('header.offline')).toBeInTheDocument();
    });
  });

  describe('Control de Tema (Modo Claro/Oscuro)', () => {
    it('muestra el icono ☀️ y cambia el tema si no es dark mode', () => {
      setupStore(80, 'DISCHARGING');
      render(<Header onMenuClick={mockOnMenuClick} />);
      
      const themeBtn = document.querySelector('.theme-toggle-btn');
      expect(themeBtn).toHaveTextContent('☀️');
      
      fireEvent.click(themeBtn);
      expect(mockToggleTheme).toHaveBeenCalledTimes(1);
    });

    it('muestra el icono 🌙 si es dark mode', () => {
      useTheme.mockReturnValue({ isDarkMode: true, toggleTheme: mockToggleTheme });
      setupStore(80, 'DISCHARGING');
      render(<Header onMenuClick={mockOnMenuClick} />);
      
      const themeBtn = document.querySelector('.theme-toggle-btn');
      expect(themeBtn).toHaveTextContent('🌙');
    });
  });

  describe('Selector de Idioma', () => {
    it('permite abrir el dropdown y seleccionar un idioma diferente', async () => {
      setupStore(80, 'DISCHARGING');
      render(<Header onMenuClick={mockOnMenuClick} />);
      
      // Hacemos click en el idioma actual
      const langBtn = screen.getByText('ES');
      fireEvent.click(langBtn);

      // Verificamos que se abrió buscando la opción "EN" (tu array LANGUAGES)
      const englishOption = screen.getByText('EN');
      
      // Usamos act() porque click lanza una promesa asíncrona (changeLanguage().then)
      await act(async () => {
        fireEvent.click(englishOption);
      });

      expect(mockChangeLanguage).toHaveBeenCalledWith('en');
      expect(mockAddToast).toHaveBeenCalledWith('notifications.languageChanged', 'info');
    });
  });

  describe('Widget de Batería y Modal', () => {
    it('aplica la clase "good" si la batería es mayor al 50%', () => {
      setupStore(80, 'DISCHARGING');
      render(<Header onMenuClick={mockOnMenuClick} />);
      expect(document.querySelector('.battery-widget')).toHaveClass('good');
    });

    it('aplica la clase "low" si la batería está entre 10% y 50%', () => {
      setupStore(30, 'DISCHARGING');
      render(<Header onMenuClick={mockOnMenuClick} />);
      expect(document.querySelector('.battery-widget')).toHaveClass('low');
    });

    it('aplica la clase "critical" si la batería es menor a 10%', () => {
      setupStore(5, 'DISCHARGING');
      render(<Header onMenuClick={mockOnMenuClick} />);
      expect(document.querySelector('.battery-widget')).toHaveClass('critical');
    });

    it('aplica la clase "charging" y muestra el rayo si el estado es CHARGING', () => {
      setupStore(50, 'CHARGING');
      render(<Header onMenuClick={mockOnMenuClick} />);
      expect(document.querySelector('.battery-widget')).toHaveClass('charging');
      expect(screen.getByText('⚡')).toBeInTheDocument();
    });

    it('aplica la clase "solar" y muestra el icono 🌤️ si netPower > 0 y no está cargando', () => {
      setupStore(50, 'DISCHARGING', 100);
      render(<Header onMenuClick={mockOnMenuClick} />);
      expect(document.querySelector('.battery-widget')).toHaveClass('solar');
      expect(screen.getByText('🌤️')).toBeInTheDocument();
    });

    it('abre y cierra el BatteryModal al hacer clic en el widget', () => {
      setupStore(80, 'DISCHARGING');
      render(<Header onMenuClick={mockOnMenuClick} />);
      
      expect(screen.queryByTestId('mock-modal')).not.toBeInTheDocument();

      const batteryWidget = document.querySelector('.battery-widget');
      fireEvent.click(batteryWidget);
      expect(screen.getByTestId('mock-modal')).toBeInTheDocument();

      const closeBtn = screen.getByText('Close Modal');
      fireEvent.click(closeBtn);
      expect(screen.queryByTestId('mock-modal')).not.toBeInTheDocument();
    });
  });
});