import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Header from '../Header.jsx';
import { useRobotStore } from '../../store/robotStore';
import { useThemeStore } from '../../store/themeStore';
import { useToastStore } from '../../store/toastStore';

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
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}));

vi.mock('../../store/toastStore', () => ({
  useToastStore: vi.fn(),
}));

vi.mock('../../store/robotStore', () => ({ useRobotStore: vi.fn() }));
vi.mock('../../store/themeStore', () => ({ useThemeStore: vi.fn() }));

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

describe('Componente Header', () => {
  const mockOnMenuClick = vi.fn();
  const mockToggleTheme = vi.fn();
  const mockAddToast = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    currentLang = 'es';
    useThemeStore.mockReturnValue({ isDarkMode: false, toggleTheme: mockToggleTheme });
    useToastStore.mockReturnValue({ addToast: mockAddToast });
  });

  // Ajustado para mockear netPower e isConnected y cubrir todas las ramas
  const setupStore = (percentage, status, netPower = 0, isConnected = true) => {
    useRobotStore.mockImplementation((selector) => {
      const state = { battery: { percentage, status, netPower }, isConnected };
      return typeof selector === 'function' ? selector(state) : state;
    });
  };

  it('renderiza Header correctamente e interactúa con el menú', () => {
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

  describe('Control de Tema', () => {
    it('muestra icono ☀️ y alterna tema si no es modo oscuro', () => {
      setupStore(80, 'DISCHARGING');
      render(<Header onMenuClick={mockOnMenuClick} />);
      
      const themeBtn = document.querySelector('.theme-toggle-btn');
      expect(themeBtn).toHaveTextContent('☀️');
      
      fireEvent.click(themeBtn);
      expect(mockToggleTheme).toHaveBeenCalledTimes(1);
    });

    it('muestra icono 🌙 si es modo oscuro', () => {
      useThemeStore.mockReturnValue({ isDarkMode: true, toggleTheme: mockToggleTheme });
      setupStore(80, 'DISCHARGING');
      render(<Header onMenuClick={mockOnMenuClick} />);
      
      const themeBtn = document.querySelector('.theme-toggle-btn');
      expect(themeBtn).toHaveTextContent('🌙');
    });
  });

  describe('Selector de Idioma', () => {
    it('permite abrir el menú desplegable y seleccionar otro idioma', async () => {
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

  describe('Widget y Modal de Batería', () => {
    it('aplica clase good si la batería supera 50%', () => {
      setupStore(80, 'DISCHARGING');
      render(<Header onMenuClick={mockOnMenuClick} />);
      expect(document.querySelector('.battery-widget')).toHaveClass('good');
    });

    it('aplica clase low si la batería está entre 10% y 50%', () => {
      setupStore(30, 'DISCHARGING');
      render(<Header onMenuClick={mockOnMenuClick} />);
      expect(document.querySelector('.battery-widget')).toHaveClass('low');
    });

    it('aplica clase critical si la batería es menor a 10%', () => {
      setupStore(5, 'DISCHARGING');
      render(<Header onMenuClick={mockOnMenuClick} />);
      expect(document.querySelector('.battery-widget')).toHaveClass('critical');
    });

    it('aplica clase charging y muestra rayo si estado es CARGANDO', () => {
      setupStore(50, 'CHARGING');
      render(<Header onMenuClick={mockOnMenuClick} />);
      expect(document.querySelector('.battery-widget')).toHaveClass('charging');
      expect(screen.getByText('⚡')).toBeInTheDocument();
    });

    it('aplica clase solar y muestra icono 🌤️ si netPower > 0', () => {
      setupStore(50, 'DISCHARGING', 100);
      render(<Header onMenuClick={mockOnMenuClick} />);
      expect(document.querySelector('.battery-widget')).toHaveClass('solar');
      expect(screen.getByText('🌤️')).toBeInTheDocument();
    });

    it('abre y cierra BatteryModal al hacer clic en el widget', () => {
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
